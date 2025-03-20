import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import Sidebar from "@/components/sidebar";
import LoadingModal from "@/components/loading";
import { getCookie } from "../../src/utils/cookieUtils";

const GraficaActualizado = () => {
    const [data, setData] = useState([]);
    const [dataActual, setDataActual] = useState([]);
    const [updatedRubros, setUpdatedRubros] = useState([]);
    const [updatedRubrosActualizado, setUpdatedRubrosActualizado] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uenFilter, setUenFilter] = useState(null); // UEN seleccionado
    const [rubroFilter, setRubroFilter] = useState(null); // Rubro seleccionado
    const [uenOptions, setUenOptions] = useState([]); // Lista de UENs
    const [rubroChartData, setRubroChartData] = useState([]);
    const [subrubroChartData, setSubrubroChartData] = useState([]);
    const [CombinedrubroChartData, setCombinedRubroChartData] = useState([]);
    const [CombinedsubrubroChartData, setCombinedSubrubroChartData] = useState([]);
    const [error, setError] = useState(null);

    const organizeGenericData = (data) => {
        const organizedData = {};
        data.forEach((item) => {
            const year = new Date(item.fecha).getFullYear();
            const uen = item.uen;
            const zone = item.cuenta.regional;
            const rubroIndex = item.rubro;
            const subrubroIndex = item.subrubro;

            const totalPresupuestoMes = item.meses_presupuesto?.reduce(
                (total, mes) => total + parseFloat(mes.presupuestomes || 0),
                0
            ) || 0;

            // if (!organizedData[year]) organizedData[year] = {};
            // if (!organizedData[year][uen]) organizedData[year][uen] = { total: 0, rubros: {} };
            // if (!organizedData[year][uen].rubros[rubroIndex])
            //     organizedData[year][uen].rubros[rubroIndex] = { total: 0, subrubros: {} };

            // if (!organizedData[year][uen].rubros[rubroIndex].subrubros[subrubroIndex])
            //     organizedData[year][uen].rubros[rubroIndex].subrubros[subrubroIndex] = { total: 0 };
            if (!organizedData[year]) organizedData[year] = {};
            if (!organizedData[year][uen]) organizedData[year][uen] = { total: 0, zones: {} };
            if (!organizedData[year][uen].zones[zone]) organizedData[year][uen].zones[zone] = { total: 0, rubros: {} };
            if (!organizedData[year][uen].zones[zone].rubros[rubroIndex]) {
              organizedData[year][uen].zones[zone].rubros[rubroIndex] = {
                total: 0,
                subrubros: {},
              };
            }
        
            if (!organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex]) {
              organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex] = {
                total: 0,
              };
            }
            organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex].total += totalPresupuestoMes;

            if (rubroIndex === 3 && subrubroIndex === 14) {
      
            } else {
              // Agregar a los totales de rubro, zona y UEN si no es "HONORARIOS INTERNOS"
              organizedData[year][uen].zones[zone].rubros[rubroIndex].total += totalPresupuestoMes;
              organizedData[year][uen].zones[zone].total += totalPresupuestoMes;
              organizedData[year][uen].total += totalPresupuestoMes;
            }
            // organizedData[year][uen].rubros[rubroIndex].subrubros[subrubroIndex].total += totalPresupuestoMes;
            // organizedData[year][uen].rubros[rubroIndex].total += totalPresupuestoMes;
            // organizedData[year][uen].total += totalPresupuestoMes;
        });

        return organizedData;
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const csrftoken = getCookie("csrftoken");
            const token = localStorage.getItem("token");
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const fetchDataset = async (endpoint) => {
                let allData = [];
                let page = 1;
                let totalPages = 1;

                do {
                    const response = await fetch(`${API_URL}/${endpoint}/?page=${page}`, {
                        headers: {
                            "X-CSRFToken": csrftoken,
                            Authorization: `Token ${token}`,
                            "Content-Type": "application/json",
                        },
                    });

                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

                    const data = await response.json();
                    allData = [...allData, ...data.results];
                    totalPages = Math.ceil(data.count / 3000);
                    page++;
                } while (page <= totalPages);

                return allData;
            };

            const [proyectadoData, actualizadoData] = await Promise.all([
                fetchDataset("GraficaPresupuestoInicial"),
                fetchDataset("GraficaPresupuestoActualizado"),
            ]);

            const organizedProyectado = organizeGenericData(proyectadoData);
            const organizedActualizado = organizeGenericData(actualizadoData);

            setUpdatedRubros(proyectadoData[0]?.updatedRubros || []);
            setUpdatedRubrosActualizado(actualizadoData[0]?.updatedRubros || []);
            setData(organizedProyectado);
            setDataActual(organizedActualizado);

            // Generar lista de UENs únicos
            const uniqueUENs = [
                ...new Set(
                    Object.entries(organizedProyectado)
                        .flatMap(([, uens]) => Object.keys(uens))
                ),
            ];
            setUenOptions(uniqueUENs);
        } catch (err) {
            setError(err);
            console.error("Error al cargar los datos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (uenFilter) {
            setRubroChartData(generateRubroChartData());
            setSubrubroChartData(generateSubrubroChartData());
        } else {
            // When no UEN filter is applied, show the combined data for all UENs
            setCombinedRubroChartData(generateCombinedRubroChartData());
            setCombinedSubrubroChartData(generateCombinedSubrubroChartData());
        }
    }, [uenFilter, rubroFilter]);

    const calculateTotalsProyectado = (uens) => {    
        const totals = {
            ingresosOperacionalesTotal: 0,
            costosIndirectosTotal: 0,
            costosDeVentaTotal: 0,
            gastosOperacionalesAdministrativosTotal: 0,
            gastosOperacionalesComercialesTotal: 0,
            ingresosNoOperacionalesTotal: 0,
            gastosNoOperacionalesTotal: 0,
        };
        
        Object.entries(uens).forEach(([rubroIndex, rubroData]) => {
            const rubroName = updatedRubros?.[rubroIndex]?.nombre || "Unknown";
            const rubroTotal = rubroData.total || 0;
        
            // Sumar el total del rubro al acumulador correspondiente
            switch (rubroName) {
            case "INGRESOS OPERACIONALES":
                totals.ingresosOperacionalesTotal += rubroTotal;
                break;
            case "COSTOS INDIRECTOS":
                totals.costosIndirectosTotal += rubroTotal;
                break;
            case "COSTOS DE VENTA":
                totals.costosDeVentaTotal += rubroTotal;
                break;
            case "GASTOS OPERACIONALES DE ADMINISTRACION":
                totals.gastosOperacionalesAdministrativosTotal += rubroTotal;
                break;
            case "GASTOS OPERACIONALES DE COMERCIALIZACION":
                totals.gastosOperacionalesComercialesTotal += rubroTotal;
                break;
            case "INGRESOS NO OPERACIONALES":
                totals.ingresosNoOperacionalesTotal += rubroTotal;
                break;
            case "GASTOS NO OPERACIONALES":
                totals.gastosNoOperacionalesTotal += rubroTotal;
                break;
            default:
                break;
            }
        });
        
        // Totales derivados
        const utilidadBruta =
            totals.ingresosOperacionalesTotal -
            totals.costosDeVentaTotal -
            totals.costosIndirectosTotal;
        
        const utilidadoPerdidaOperacional =
            utilidadBruta -
            totals.gastosOperacionalesAdministrativosTotal -
            totals.gastosOperacionalesComercialesTotal;
        
        const utilidadAntesDeImpuesto =
            utilidadoPerdidaOperacional +
            totals.ingresosNoOperacionalesTotal -
            totals.gastosNoOperacionalesTotal;
        
        return { ...totals, utilidadBruta, utilidadoPerdidaOperacional, utilidadAntesDeImpuesto };
    };
        
    const calculateTotalsActualizado = (uens) => {
        const totals = {
            ingresosOperacionalesTotalActualizado: 0,
            costosIndirectosTotalActualizado: 0,
            costosDeVentaTotalActualizado: 0,
            gastosOperacionalesAdministrativosTotalActualizado: 0,
            gastosOperacionalesComercialesTotalActualizado: 0,
            ingresosNoOperacionalesTotalActualizado: 0,
            gastosNoOperacionalesTotalActualizado: 0,
        };
        
        Object.entries(uens).forEach(([rubroIndex, rubroData]) => {
            const rubroName = updatedRubros?.[rubroIndex]?.nombre || "Unknown";
            const rubroTotal = rubroData.total || 0;
        
            switch (rubroName) {
                case "INGRESOS OPERACIONALES":
                totals.ingresosOperacionalesTotalActualizado += rubroTotal;
                break;
                case "COSTOS INDIRECTOS":
                totals.costosIndirectosTotalActualizado += rubroTotal;
                break;
                case "COSTOS DE VENTA":
                totals.costosDeVentaTotalActualizado += rubroTotal;
                break;
                case "GASTOS OPERACIONALES DE ADMINISTRACION":
                totals.gastosOperacionalesAdministrativosTotalActualizado += rubroTotal;
                break;
                case "GASTOS OPERACIONALES DE COMERCIALIZACION":
                totals.gastosOperacionalesComercialesTotalActualizado += rubroTotal;
                break;
                case "INGRESOS NO OPERACIONALES":
                totals.ingresosNoOperacionalesTotalActualizado += rubroTotal;
                break;
                case "GASTOS NO OPERACIONALES":
                totals.gastosNoOperacionalesTotalActualizado += rubroTotal;
                break;
                default:
                break;
            }
        });
        
        // Totales derivados
        const utilidadBrutaActualizado =
            totals.ingresosOperacionalesTotalActualizado -
            totals.costosDeVentaTotalActualizado -
            totals.costosIndirectosTotalActualizado;
        
        const utilidadoPerdidaOperacionalActualizado =
            utilidadBrutaActualizado -
            totals.gastosOperacionalesAdministrativosTotalActualizado -
            totals.gastosOperacionalesComercialesTotalActualizado;
        
        const utilidadAntesDeImpuestoActualizado =
            utilidadoPerdidaOperacionalActualizado +
            totals.ingresosNoOperacionalesTotalActualizado -
            totals.gastosNoOperacionalesTotalActualizado;
        
        return { ...totals, utilidadBrutaActualizado, utilidadoPerdidaOperacionalActualizado, utilidadAntesDeImpuestoActualizado };
    };

    updatedRubros.forEach(rubro => {
        if (rubro.nombre === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            rubro.nombre = "GASTOS ADMINISTRACION";
        }
        if (rubro.nombre === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            rubro.nombre = "GASTOS COMERCIALIZACION";
        }
    });

    const generateCombinedRubroChartData = () => {
        const chartData = [];
    
        // Define el orden personalizado de las categorías
        const categoriaOrder = [
            "INGRESOS OPERACIONALES",
            "COSTOS DE VENTA",
            "GASTOS ADMINISTRACION",
            "GASTOS COMERCIALIZACION",
            "INGRESOS NO OPERACIONALES",
            "GASTOS NO OPERACIONALES",
            "UTILIDAD"
        ];
        
        Object.entries(data).forEach(([year, uens]) => {
            const combinedRubrosActualizado = {};
            const combinedRubrosProyectado = {};
            const actualizedYearData = dataActual[year] || {};
            let costosVentaTotalProyectado = 0;
            let costosVentaTotalActualizado = 0;
    
            // **Recorrer cada UEN y sus zonas para combinar los datos**
            Object.values(uens).forEach((uenData) => {
                const zonas = uenData.zones || {};
                Object.values(zonas).forEach(({ rubros }) => {
                    Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
                        if (!combinedRubrosProyectado[rubroIndex]) {
                            combinedRubrosProyectado[rubroIndex] = { total: 0 };
                        }
                        combinedRubrosProyectado[rubroIndex].total += rubroData.total || 0;
                    });
                });
            });
    
            Object.values(actualizedYearData).forEach((uenData) => {
                const zonasActualizadas = uenData.zones || {};
                Object.values(zonasActualizadas).forEach(({ rubros }) => {
                    Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
                        if (!combinedRubrosActualizado[rubroIndex]) {
                            combinedRubrosActualizado[rubroIndex] = { total: 0 };
                        }
                        combinedRubrosActualizado[rubroIndex].total += rubroData.total || 0;
                    });
                });
            });
    
            // **Calcular totales**
            const proyectadoTotals = calculateTotalsProyectado(combinedRubrosProyectado);
            const actualizadoTotals = calculateTotalsActualizado(combinedRubrosActualizado);
    
            // **Procesar rubros y agregar los datos**
            Object.entries(combinedRubrosProyectado).forEach(([rubroIndex, rubroData]) => {
                const rubroNombre = updatedRubros?.[rubroIndex]?.nombre || updatedRubrosActualizado?.[rubroIndex]?.nombre || "Rubro Desconocido";
                const proyectadoTotal = rubroData.total || 0;
                const actualizadoTotal = combinedRubrosActualizado?.[rubroIndex]?.total || 0;
    
                if (rubroNombre === "COSTOS DE VENTA" || rubroNombre === "COSTOS INDIRECTOS") {
                    costosVentaTotalProyectado += proyectadoTotal;
                    costosVentaTotalActualizado += actualizadoTotal;
                } else {
                    const diferenciaTotal = (proyectadoTotal - actualizadoTotal) || 0;
    
                    chartData.push({
                        year,
                        categoria: rubroNombre,
                        proyectado: (proyectadoTotal / 1_000_000).toFixed(0),
                        actualizado: (actualizadoTotal / 1_000_000).toFixed(0),
                        diferencia: (diferenciaTotal / 1_000_000).toFixed(0),
                    });
                }
            });
    
            // **Agregar "COSTOS DE VENTA" combinado**
            const diferenciaTotalCostosVenta = (costosVentaTotalProyectado - costosVentaTotalActualizado) || 0;
            chartData.push({
                year,
                categoria: "COSTOS DE VENTA",
                proyectado: (costosVentaTotalProyectado / 1_000_000).toFixed(0),
                actualizado: (costosVentaTotalActualizado / 1_000_000).toFixed(0),
                diferencia: (diferenciaTotalCostosVenta / 1_000_000).toFixed(0),
            });
    
            // **Agregar "UTILIDAD"**
            const diferenciaTotalUtilidad = (proyectadoTotals.utilidadAntesDeImpuesto - actualizadoTotals.utilidadAntesDeImpuestoActualizado) || 0;
            chartData.push({
                year,
                categoria: "UTILIDAD",
                proyectado: (proyectadoTotals.utilidadAntesDeImpuesto / 1_000_000).toFixed(0),
                actualizado: (actualizadoTotals.utilidadAntesDeImpuestoActualizado / 1_000_000).toFixed(0),
                diferencia: (diferenciaTotalUtilidad / 1_000_000).toFixed(0),
            });
        });
    
        // **Ordenar los datos según el orden predefinido**
        chartData.sort((a, b) => {
            const indexA = categoriaOrder.indexOf(a.categoria);
            const indexB = categoriaOrder.indexOf(b.categoria);
            return indexA - indexB;
        });
    
        return chartData;
    };
        
    const generateCombinedSubrubroChartData = () => {
        const chartData = [];
    
        Object.entries(data).forEach(([year, uens]) => {
            if (!rubroFilter) return; // Si no hay filtro de rubro, no se genera la gráfica
    
            const combinedSubrubrosDataProyectado = {};
            const combinedSubrubrosDataActualizado = {};
    
            // Recorre todas las UENs y sus zonas
            Object.values(uens).forEach((uenData) => {
                Object.values(uenData.zones || {}).forEach((zoneData) => {
                    Object.entries(zoneData.rubros || {}).forEach(([rubroIndex, rubroData]) => {
                        if (rubroIndex === rubroFilter) {
                            Object.entries(rubroData.subrubros || {}).forEach(([subrubroIndex, subrubroData]) => {
                                if (!combinedSubrubrosDataProyectado[subrubroIndex]) {
                                    combinedSubrubrosDataProyectado[subrubroIndex] = { total: 0 };
                                }
                                combinedSubrubrosDataProyectado[subrubroIndex].total += subrubroData.total || 0;
                            });
                        }
                    });
                });
            });
    
            Object.values(dataActual[year] || {}).forEach((uenData) => {
                Object.values(uenData.zones || {}).forEach((zoneData) => {
                    Object.entries(zoneData.rubros || {}).forEach(([rubroIndex, rubroData]) => {
                        if (rubroIndex === rubroFilter) {
                            Object.entries(rubroData.subrubros || {}).forEach(([subrubroIndex, subrubroData]) => {
                                if (!combinedSubrubrosDataActualizado[subrubroIndex]) {
                                    combinedSubrubrosDataActualizado[subrubroIndex] = { total: 0 };
                                }
                                combinedSubrubrosDataActualizado[subrubroIndex].total += subrubroData.total || 0;
                            });
                        }
                    });
                });
            });
    
            // Generar los datos finales del gráfico
            Object.entries(combinedSubrubrosDataProyectado).forEach(([subrubroIndex, subrubroData]) => {
                const subrubroNombre = updatedRubros[rubroFilter]?.subrubros?.[subrubroIndex]?.nombre || "Subrubro Desconocido";
                const proyectadoTotal = subrubroData.total || 0;
                const actualizadoTotal = combinedSubrubrosDataActualizado?.[subrubroIndex]?.total || 0;
                const diferenciaTotal = (proyectadoTotal - actualizadoTotal) || 0;
    
                chartData.push({
                    year,
                    categoria: subrubroNombre,
                    proyectado: (proyectadoTotal / 1_000_000).toFixed(0),
                    actualizado: (actualizadoTotal / 1_000_000).toFixed(0),
                    diferencia: (diferenciaTotal / 1_000_000).toFixed(0),
                });
            });
        });
    
        return chartData;
    };  



    const generateRubroChartData = () => {
        const chartData = [];

        // Define el orden personalizado de las categorías
        const categoriaOrder = [
            "INGRESOS OPERACIONALES",
            "COSTOS DE VENTA",
            "GASTOS ADMINISTRACION",
            "GASTOS COMERCIALIZACION",
            "INGRESOS NO OPERACIONALES",
            "GASTOS NO OPERACIONALES",
            "UTILIDAD"
        ];
    
        Object.entries(data).forEach(([year, uens]) => {

            if (!uenFilter || !uens[uenFilter]) return;
            const yearPercentages = {
                2024: {
                  nacionalConstructora: 0.4,
                  nacionalPromotora: 0.4,
                  nacionalInmobiliaria: 0.2,
                  diferenteNacionalConstructora: 0.4,
                  diferenteNacionalPromotora: 0.5,
                  diferenteNacionalInmobiliaria: 0.1,
                },
                2025: {
                  nacionalConstructora: 0.4,
                  nacionalPromotora: 0.4,
                  nacionalInmobiliaria: 0.2,
                  diferenteNacionalConstructora: 0.4,
                  diferenteNacionalPromotora: 0.5,
                  diferenteNacionalInmobiliaria: 0.1,
                },
            };
            // Obtener porcentajes para el año actual
            const percentages = yearPercentages[year] || {};

            const apoyoTotalZonas = uens["Unidades de Apoyo"]?.zones || 0;
            const nacionalTotalsFinal = apoyoTotalZonas.Nacional || {};
            const exceptonacionalZoneTotalsFinal = Object.fromEntries(
              Object.entries(apoyoTotalZonas).filter(([zones]) => zones !== "Nacional")
            );

            // Distribuir los totales de "Nacional"
            const nacionalShareConstructoraFinal = calculateShare(nacionalTotalsFinal, percentages.nacionalConstructora);
            const nacionalSharePromotoraFinal = calculateShare(nacionalTotalsFinal, percentages.nacionalPromotora);
            const nacionalShareInmobiliariaFinal = calculateShare(nacionalTotalsFinal, percentages.nacionalInmobiliaria);
            // Distribuir los totales de las demás zonas
            const otherZonesShareConstructoraFinal = calculateShareExceptoNacional(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalConstructora);
            const otherZonesSharePromotoraFinal = calculateShareExceptoNacional(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalPromotora);
            const otherZonesShareInmobiliariaFinal = calculateShareExceptoNacional(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalInmobiliaria);
            console.log(nacionalShareConstructoraFinal, otherZonesShareConstructoraFinal)

            // Aplicar los valores distribuidos a los rubros de Constructora, Promotora e Inmobiliaria
            applyDistributedValues("Constructora", nacionalShareConstructoraFinal, otherZonesShareConstructoraFinal);
            applyDistributedValues("Promotora", nacionalSharePromotoraFinal, otherZonesSharePromotoraFinal);
            applyDistributedValues("Inmobiliaria", nacionalShareInmobiliariaFinal, otherZonesShareInmobiliariaFinal);

            // Acceder a las zonas dentro del UEN seleccionado
            const zonas = uens[uenFilter]?.zones || {};
            const zonasActualizadas = dataActual?.[year]?.[uenFilter]?.zones || {};

            let rubrosDataProyectado = {};
            let rubrosDataActualizado = {};

            // Recorrer cada zona para combinar los rubros
            Object.entries(zonas).forEach(([zona, { rubros }]) => {
                Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
                    rubrosDataProyectado[rubroIndex] = {
                        total: (rubrosDataProyectado[rubroIndex]?.total || 0) + rubroData.total,
                    };
                });
            });

            Object.entries(zonasActualizadas).forEach(([zona, { rubros }]) => {
                Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
                    rubrosDataActualizado[rubroIndex] = {
                        total: (rubrosDataActualizado[rubroIndex]?.total || 0) + rubroData.total,
                    };
                });
            });

            // Función para distribuir valores de Nacional
            function calculateShare(totals, percentage) {
                return {
                    total: (totals.total || 0) * percentage,
                };
            }

            // Función para distribuir valores de otras zonas
            function calculateShareExceptoNacional(totals, percentage) {
                return Object.entries(totals).reduce((acc, [zone, data]) => {
                    acc[zone] = { total: (data.total || 0) * percentage };
                    return acc;
                }, {});
            }

            // Función para sumar valores distribuidos a los rubros del UEN seleccionado
            function applyDistributedValues(uenName, nacionalShare, otherZonesShare) {
                if (uens[uenName]) {
                    uens[uenName].total += (nacionalShare.total || 0);
                    Object.entries(otherZonesShare).forEach(([zone, data]) => {
                        if (uens[uenName].zones?.[zone]) {
                            uens[uenName].zones[zone].total += data.total || 0;
                        }
                    });
                }
            }

            let costosVentaTotalProyectado = 0;
            let costosVentaTotalActualizado = 0;
    
            const proyectadoTotals = calculateTotalsProyectado(rubrosDataProyectado);
            const actualizadoTotals = calculateTotalsActualizado(rubrosDataActualizado);
    
            // Procesar los datos combinando "COSTOS DE VENTA" y "COSTOS INDIRECTOS"
            Object.entries(rubrosDataProyectado).forEach(([rubroIndex, { total: proyectadoTotal }]) => {
                const rubroNombre = updatedRubros?.[rubroIndex]?.nombre || updatedRubrosActualizado?.[rubroIndex]?.nombre || "Rubro Desconocido";
                const actualizadoTotal = rubrosDataActualizado?.[rubroIndex]?.total || 0;
    
                if (rubroNombre === "COSTOS DE VENTA" || rubroNombre === "COSTOS INDIRECTOS") {
                    costosVentaTotalProyectado += proyectadoTotal;
                    costosVentaTotalActualizado += actualizadoTotal;
                } else {
                    const diferenciaTotal = (proyectadoTotal - actualizadoTotal) || 0;
    
                    chartData.push({
                        year,
                        categoria: rubroNombre,
                        proyectado: (proyectadoTotal / 1_000_000).toFixed(0),
                        actualizado: (actualizadoTotal / 1_000_000).toFixed(0),
                        diferencia: (diferenciaTotal / 1_000_000).toFixed(0),
                    });
                }
            });
    
            // Agregar "COSTOS DE VENTA" como la suma de "COSTOS DE VENTA" y "COSTOS INDIRECTOS"
            const diferenciaTotalCostosVenta = (costosVentaTotalProyectado - costosVentaTotalActualizado) || 0;
            chartData.push({
                year,
                categoria: "COSTOS DE VENTA",
                proyectado: (costosVentaTotalProyectado / 1_000_000).toFixed(0),
                actualizado: (costosVentaTotalActualizado / 1_000_000).toFixed(0),
                diferencia: (diferenciaTotalCostosVenta / 1_000_000).toFixed(0),
            });
    
            // Agregar utilidad antes de impuestos
            const diferenciaTotalUtilidad = (proyectadoTotals.utilidadAntesDeImpuesto - actualizadoTotals.utilidadAntesDeImpuestoActualizado) || 0;
            chartData.push({
                year,
                categoria: "UTILIDAD",
                proyectado: (proyectadoTotals.utilidadAntesDeImpuesto / 1_000_000).toFixed(0),
                actualizado: (actualizadoTotals.utilidadAntesDeImpuestoActualizado / 1_000_000).toFixed(0),
                diferencia: (diferenciaTotalUtilidad / 1_000_000).toFixed(0),
            });
        });
    
        // Ordenar datos según el orden predefinido de categorías
        chartData.sort((a, b) => {
            const indexA = categoriaOrder.indexOf(a.categoria);
            const indexB = categoriaOrder.indexOf(b.categoria);
            return indexA - indexB;
        });
    
        return chartData;
    };    
    
    const generateSubrubroChartData = () => {
        const chartData = [];
    
        Object.entries(data).forEach(([year, uens]) => {
            if (!uenFilter || !rubroFilter) return; // No generar si no hay UEN o Rubro seleccionado
    
            const combinedSubrubrosDataProyectado = {};
            const combinedSubrubrosDataActualizado = {};
    
            // Recorre todas las zonas dentro de la UEN seleccionada
            Object.values(uens[uenFilter]?.zones || {}).forEach((zoneData) => {
                Object.entries(zoneData.rubros || {}).forEach(([rubroIndex, rubroData]) => {
                    if (rubroIndex === rubroFilter) {
                        Object.entries(rubroData.subrubros || {}).forEach(([subrubroIndex, subrubroData]) => {
                            if (!combinedSubrubrosDataProyectado[subrubroIndex]) {
                                combinedSubrubrosDataProyectado[subrubroIndex] = { total: 0 };
                            }
                            combinedSubrubrosDataProyectado[subrubroIndex].total += subrubroData.total || 0;
                        });
                    }
                });
            });
    
            // Recorre todas las zonas de la data actualizada
            Object.values(dataActual[year]?.[uenFilter]?.zones || {}).forEach((zoneData) => {
                Object.entries(zoneData.rubros || {}).forEach(([rubroIndex, rubroData]) => {
                    if (rubroIndex === rubroFilter) {
                        Object.entries(rubroData.subrubros || {}).forEach(([subrubroIndex, subrubroData]) => {
                            if (!combinedSubrubrosDataActualizado[subrubroIndex]) {
                                combinedSubrubrosDataActualizado[subrubroIndex] = { total: 0 };
                            }
                            combinedSubrubrosDataActualizado[subrubroIndex].total += subrubroData.total || 0;
                        });
                    }
                });
            });
    
            // Obtener la lista de nombres de subrubros desde `updatedRubros`
            const subrubrosList =
                updatedRubros[rubroFilter]?.subrubros ||
                updatedRubrosActualizado[rubroFilter]?.subrubros ||
                [];
    
            // Generar datos finales del gráfico
            Object.entries(combinedSubrubrosDataProyectado).forEach(([subrubroIndex, subrubroData]) => {
                const subrubro = subrubrosList[subrubroIndex];
                const subrubroNombre = subrubro?.nombre || "Subrubro Desconocido";
                const proyectadoTotal = subrubroData.total || 0;
                const actualizadoTotal = combinedSubrubrosDataActualizado?.[subrubroIndex]?.total || 0;
                const diferenciaTotal = (proyectadoTotal - actualizadoTotal) || 0;
    
                chartData.push({
                    year,
                    categoria: subrubroNombre,
                    proyectado: (proyectadoTotal / 1_000_000).toFixed(0),
                    actualizado: (actualizadoTotal / 1_000_000).toFixed(0),
                    diferencia: (diferenciaTotal / 1_000_000).toFixed(0),
                });
            });
        });
    
        return chartData;
    };    
    
    const renderBarChart = (chartData, title) => {
        // Calcular el valor máximo en la data
        const allValues = chartData.flatMap(item => [item.proyectado, item.actualizado, item.diferencia]);
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
    
        // Redondear al siguiente múltiplo de 20,000 hacia arriba (máximo) y hacia abajo (mínimo)
        const roundedMaxValue = Math.ceil(maxValue / 20000) * 20000;
        const roundedMinValue = Math.floor(minValue / 20000) * 20000;
    
        // Asegurar que el dominio incluya el 0
        const domainMin = Math.min(0, roundedMinValue);
        const domainMax = Math.max(0, roundedMaxValue);
        return (
            <div style={{ marginBottom: "40px", padding: "0 40px" }}>
                <h2 style={{ textAlign: "center" }}>{title}</h2>
                <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={chartData} margin={{ top: 80, right: 5, left: 5, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="categoria"
                            type="category"
                            tick={{ fontSize: 12 }}
                            interval={0}
                            height={100}
                        />
                        <YAxis 
                            tick={{ fontSize: 14 }} 
                            width={100} 
                            domain={[domainMin, domainMax]} 
                            tickFormatter={(value) => formatNumberWithCommas(value)}
                        />
                        <Tooltip formatter={(value) => formatNumberWithCommas(value)} />
                        <Legend />
                        <ReferenceLine y={0} stroke="gray" strokeWidth={2} strokeDasharray="3 3" />
                        <Bar dataKey="proyectado" fill="#8884d8" name="Proyectado">
                            <LabelList 
                                dataKey="proyectado" 
                                position="top" 
                                fontSize={14} 
                                formatter={(value) => formatNumberWithCommas(value)} 
                            />
                        </Bar>
                        <Bar dataKey="actualizado" fill="#82ca9d" name="Actualizado">
                            <LabelList 
                                dataKey="actualizado" 
                                position="top" 
                                fontSize={14} 
                                formatter={(value) => formatNumberWithCommas(value)} 
                            />
                        </Bar>
                        <Bar dataKey="diferencia" fill="#ff7300" name="Diferencia">
                            <LabelList 
                                dataKey="diferencia" 
                                position="top" 
                                fontSize={14} 
                                formatter={(value) => formatNumberWithCommas(value)} 
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };
    
    // Función para formatear números con separadores de miles
    const formatNumberWithCommas = (number) => {
        return new Intl.NumberFormat('es-ES').format(number);
    };
    
    

    return (
        <div style={{ display: "flex", flexDirection: "row" }}>
            <Sidebar />
            <div style={{ display: "flex", width: "100%", flexDirection: "column" }}>
                {loading ? (
                    <LoadingModal open={loading} />
                ) : (
                    <>
                        <h2 style={{ textAlign: "center" }}>Gráfica por UEN</h2>

                        {/* Filtro por UEN */}
                        <div style={{ margin: "20px 0", textAlign: "center" }}>
                            <label htmlFor="uen-select">Selecciona un UEN: </label>
                            <select
                                id="uen-select"
                                value={uenFilter || ""}
                                onChange={(e) => setUenFilter(e.target.value || null)}
                            >
                                <option value="">Seleccionar</option>
                                {uenOptions.map((uen) => (
                                    <option key={uen} value={uen}>
                                        {uen}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Gráficas UEN*/}
                        {uenFilter ? (
                            <>
                                {/* Render chart for filtered UEN */}
                                {renderBarChart(rubroChartData)}
                                <div style={{ margin: "20px 0", textAlign: "center" }}>
                                    <label htmlFor="rubro-select">Selecciona un Rubro: </label>
                                    <select
                                        id="rubro-select"
                                        value={rubroFilter || ""}
                                        onChange={(e) => setRubroFilter(e.target.value || null)}
                                    >
                                        <option value="">Seleccionar</option>
                                        {uenFilter && (() => {
                                            const uniqueRubros = new Set();
                                            const rubroOptions = [];

                                            Object.values(data?.[2025]?.[uenFilter]?.zones || {}).forEach(zone => {
                                                Object.keys(zone?.rubros || {}).forEach(rubro => {
                                                    if (!uniqueRubros.has(rubro)) {
                                                        uniqueRubros.add(rubro);
                                                        rubroOptions.push(
                                                            <option key={rubro} value={rubro}>
                                                                {updatedRubros?.[rubro]?.nombre || "Rubro Desconocido"}
                                                            </option>
                                                        );
                                                    }
                                                });
                                            });

                                            return rubroOptions;
                                        })()}
                                    </select>
                                </div>
                                {uenFilter && rubroFilter && renderBarChart(subrubroChartData, "Gráfico por Rubro")}
                            </>
                        ) : (
                            <>
                                {/* Render combined chart for all UENs */}
                                {renderBarChart(CombinedrubroChartData)}
                                <div style={{ margin: "20px 0", textAlign: "center" }}>
                                    <label htmlFor="rubro-select">Selecciona un Rubro: </label>
                                    <select
                                        id="rubro-select"
                                        value={rubroFilter || ""}
                                        onChange={(e) => setRubroFilter(e.target.value || null)}
                                    >
                                        <option value="">Seleccionar</option>
                                        {(() => {
                                            const uniqueRubros = new Set();
                                            const rubroOptions = [];

                                            // Si hay un UEN seleccionado, filtramos solo sus zonas
                                            if (uenFilter) {
                                                Object.values(data?.[2025]?.[uenFilter]?.zones || {}).forEach(zone => {
                                                    Object.keys(zone?.rubros || {}).forEach(rubro => {
                                                        if (!uniqueRubros.has(rubro)) {
                                                            uniqueRubros.add(rubro);
                                                            rubroOptions.push(
                                                                <option key={rubro} value={rubro}>
                                                                    {updatedRubros?.[rubro]?.nombre || "Rubro Desconocido"}
                                                                </option>
                                                            );
                                                        }
                                                    });
                                                });
                                            } else {
                                                // Si NO hay UEN seleccionado, recorrer todas las UENs y zonas
                                                Object.values(data?.[2025] || {}).forEach(uen => {
                                                    Object.values(uen?.zones || {}).forEach(zone => {
                                                        Object.keys(zone?.rubros || {}).forEach(rubro => {
                                                            if (!uniqueRubros.has(rubro)) {
                                                                uniqueRubros.add(rubro);
                                                                rubroOptions.push(
                                                                    <option key={rubro} value={rubro}>
                                                                        {updatedRubros?.[rubro]?.nombre || "Rubro Desconocido"}
                                                                    </option>
                                                                );
                                                            }
                                                        });
                                                    });
                                                });
                                            }

                                            return rubroOptions;
                                        })()}
                                    </select>
                                </div>
                                {rubroFilter && renderBarChart(CombinedsubrubroChartData, "Gráfica por Rubro")}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default GraficaActualizado;