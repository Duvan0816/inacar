import React, { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import Sidebar from "@/components/sidebar";
import LoadingModal from "@/components/loading";
import { getCookie } from "../../src/utils/cookieUtils";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const csrftoken = getCookie("csrftoken");

const GraficaEjecutado = () => {
    const [data, setData] = useState([]);
    const [dataActual, setDataActual] = useState([]);
    const [updatedRubros, setUpdatedRubros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uenFilter, setUenFilter] = useState(null);
    const [rubroFilter, setRubroFilter] = useState(null); 
    const [uenOptions, setUenOptions] = useState([]); 
    const [error, setError] = useState(null);

    // Función para obtener datos de rubros
    const fetchRubrosData = async () => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/rubros/`, {
        method: "GET",
        headers: {
            "X-CSRFToken": csrftoken,
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
        },
        credentials: "include",
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    };

    // Función para obtener un dataset desde un endpoint
    const fetchDataset = async (endpoint) => {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/${endpoint}/`, {
        headers: {
            "X-CSRFToken": csrftoken,
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
        },
        credentials: "include",
        });
        if (!response.ok) {
        const errorText = await response.text();
        console.error("Error Response Text:", errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    };

    // Función para obtener todos los datos
    const fetchData = async () => {
        try {
        setLoading(true);
        const [proyectadoData, actualizadoData] = await Promise.all([
            fetchDataset("InformeDetalladoPresupuesto"),
            fetchDataset("InformePresupuestoEjecutado"),
        ]);
        setData(proyectadoData);
        setDataActual(actualizadoData);
        const rubrosData = await fetchRubrosData();
        setUpdatedRubros(rubrosData);
        // Generar lista de UENs únicos
        const uniqueUENs = [
            ...new Set(
                Object.entries(proyectadoData)
                    .flatMap(([, uens]) => Object.keys(uens))
            ),
        ];
        setUenOptions(uniqueUENs);
        } catch (err) {
        console.error("Error al cargar los datos:", err);
        setError(err.message);
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

            const yearPercentages = {
                2025: {
                  nacionalConstructora: 0.4,
                  nacionalPromotora: 0.4,
                  nacionalInmobiliaria: 0.2,
                  diferenteNacionalConstructora: 0.4,
                  diferenteNacionalPromotora: 0.5,
                  diferenteNacionalInmobiliaria: 0.1,
                },
            };

            const percentages = yearPercentages[year] || {};

            const aplicarPorcentaje = (nacionalShare, rubrosData, tipo) => {
                Object.entries(nacionalShare).forEach(([rubroIndex, rubroData]) => {
                    const index = Number(rubroIndex);
                    if (!rubrosData[index]) return;
                    rubrosData[index].total += rubroData.total;
                });
            };

            const actualizedYearData = dataActual[year] || {};
            const combinedRubrosActualizado = {};
            const combinedRubrosProyectado = {};
    
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

            // Obtener datos de Unidades de Apoyo
            const apoyoTotalZonas = uens["Unidades de Apoyo"]?.zones || {};
            const nacionalTotalsProyectado = apoyoTotalZonas.Nacional?.rubros || {};
            const exceptonacionalZoneTotalsProyectado = Object.fromEntries(
                Object.entries(apoyoTotalZonas).filter(([zones]) => zones !== "Nacional")
            );

            const nacionalShareConstructoraProyectado = calculateShareNacional(nacionalTotalsProyectado, percentages.nacionalConstructora);
            const nacionalSharePromotoraProyectado = calculateShareNacional(nacionalTotalsProyectado, percentages.nacionalPromotora);
            const nacionalShareInmobiliariaProyectado = calculateShareNacional(nacionalTotalsProyectado, percentages.nacionalInmobiliaria);

            // Aplicar porcentaje de Unidades de Apoyo a la UEN filtrada
            aplicarPorcentaje(nacionalShareConstructoraProyectado, combinedRubrosProyectado);
            aplicarPorcentaje(nacionalSharePromotoraProyectado, combinedRubrosProyectado);
            aplicarPorcentaje(nacionalShareInmobiliariaProyectado, combinedRubrosProyectado);

            // Aplicar distribución de otras zonas
            const otherZonesShareConstructoraProyectado = calculateShareExceptoNacional(exceptonacionalZoneTotalsProyectado, percentages.diferenteNacionalConstructora);
            const otherZonesSharePromotoraProyectado = calculateShareExceptoNacional(exceptonacionalZoneTotalsProyectado, percentages.diferenteNacionalPromotora);
            const otherZonesShareInmobiliariaProyectado = calculateShareExceptoNacional(exceptonacionalZoneTotalsProyectado, percentages.diferenteNacionalInmobiliaria);
    
            aplicarPorcentaje(otherZonesShareConstructoraProyectado, combinedRubrosProyectado);
            aplicarPorcentaje(otherZonesSharePromotoraProyectado, combinedRubrosProyectado);
            aplicarPorcentaje(otherZonesShareInmobiliariaProyectado, combinedRubrosProyectado);

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

            const apoyoTotalZonasActualizadas = dataActual?.[year]?.["Unidades de Apoyo"]?.zones || {};
            const nacionalTotalsActualizadas = apoyoTotalZonasActualizadas.Nacional?.rubros || {};
            const exceptonacionalZoneTotalsActualizadas = Object.fromEntries(
                Object.entries(apoyoTotalZonasActualizadas).filter(([zones]) => zones !== "Nacional")
            );   

            // Aplicar distribución de la zona nacional
            const nacionalShareConstructoraActualizadas = calculateShareNacional(nacionalTotalsActualizadas, percentages.nacionalConstructora);
            const nacionalSharePromotoraActualizadas = calculateShareNacional(nacionalTotalsActualizadas, percentages.nacionalPromotora);
            const nacionalShareInmobiliariaActualizadas = calculateShareNacional(nacionalTotalsActualizadas, percentages.nacionalInmobiliaria);

            // Aplicar porcentaje de Unidades de Apoyo
            aplicarPorcentaje(nacionalShareConstructoraActualizadas, combinedRubrosActualizado);
            aplicarPorcentaje(nacionalSharePromotoraActualizadas, combinedRubrosActualizado);
            aplicarPorcentaje(nacionalShareInmobiliariaActualizadas, combinedRubrosActualizado);

            // Aplicar distribución de otras zonas
            const otherZonesShareConstructoraActualizadas = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizadas, percentages.diferenteNacionalConstructora);
            const otherZonesSharePromotoraActualizadas = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizadas, percentages.diferenteNacionalPromotora);
            const otherZonesShareInmobiliariaActualizadas = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizadas, percentages.diferenteNacionalInmobiliaria);
    
            // Aplicar porcentaje de Unidades de Apoyo
            aplicarPorcentaje(otherZonesShareConstructoraActualizadas, combinedRubrosActualizado);
            aplicarPorcentaje(otherZonesSharePromotoraActualizadas, combinedRubrosActualizado);
            aplicarPorcentaje(otherZonesShareInmobiliariaActualizadas, combinedRubrosActualizado);

            // Función para distribuir valores de otras zonas
            function calculateShareNacional(totals, percentage) {
                return Object.entries(totals).reduce((acc, [zone, data]) => {
                    acc[zone] = { total: (data.total || 0) * percentage };
                    return acc;
                }, {});
            }

            // Función para distribuir valores de otras zonas a los rubros
            function calculateShareExceptoNacional(totals, percentage) {
                let sharedRubros = {};

                Object.entries(totals).forEach(([zone, zoneData]) => {
                    Object.entries(zoneData.rubros || {}).forEach(([rubroIndex, rubroData]) => {
                        if (!sharedRubros[rubroIndex]) {
                            sharedRubros[rubroIndex] = { total: 0 };
                        }
                        sharedRubros[rubroIndex].total += (rubroData.total || 0) * percentage;
                    });
                });

                return sharedRubros;
            }

            let costosVentaTotalProyectado = 0;
            let costosVentaTotalActualizado = 0;
            // **Calcular totales**
            const proyectadoTotals = calculateTotalsProyectado(combinedRubrosProyectado);
            const actualizadoTotals = calculateTotalsActualizado(combinedRubrosActualizado);
    
            // **Procesar rubros y agregar los datos**
            Object.entries(combinedRubrosProyectado).forEach(([rubroIndex, rubroData]) => {
                const rubroNombre = updatedRubros?.[rubroIndex]?.nombre || "Rubro Desconocido";
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
        if (!uenFilter || !data) return chartData;
    
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
            if (!uens[uenFilter]) return;
    
            // Definir porcentajes por año
            const yearPercentages = {
                2025: {
                    nacionalConstructora: 0.4,
                    nacionalPromotora: 0.4,
                    nacionalInmobiliaria: 0.2,
                    diferenteNacionalConstructora: 0.4,
                    diferenteNacionalPromotora: 0.5,
                    diferenteNacionalInmobiliaria: 0.1,
                }
            };

            const percentages = yearPercentages[year] || {};

            const aplicarPorcentaje = (nacionalShare, rubrosData, tipo) => {
                Object.entries(nacionalShare).forEach(([rubroIndex, rubroData]) => {
                    const index = Number(rubroIndex);
                    if (!rubrosData[index]) return;
                    rubrosData[index].total += rubroData.total;
                });
            };
    
            // Obtener datos de la UEN seleccionada
            const zonasProyectadas = uens[uenFilter]?.zones || {};
            const zonasActualizadas = dataActual?.[year]?.[uenFilter]?.zones || {};
            let rubrosDataProyectado = {};
            let rubrosDataActualizado = {};
    
            // Combinar rubros de zonas proyectadas
            Object.entries(zonasProyectadas).forEach(([zona, { rubros }]) => {
                Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
                    rubrosDataProyectado[rubroIndex] = {
                        total: (rubrosDataProyectado[rubroIndex]?.total || 0) + rubroData.total,
                    };
                });
            });

            // Obtener datos de Unidades de Apoyo
            const apoyoTotalZonas = uens["Unidades de Apoyo"]?.zones || {};
            const nacionalTotalsProyectado = apoyoTotalZonas.Nacional?.rubros || {};
            const exceptonacionalZoneTotalsProyectado = Object.fromEntries(
                Object.entries(apoyoTotalZonas).filter(([zones]) => zones !== "Nacional")
            );

            const nacionalShareConstructoraProyectado = calculateShareNacional(nacionalTotalsProyectado, percentages.nacionalConstructora);
            const nacionalSharePromotoraProyectado = calculateShareNacional(nacionalTotalsProyectado, percentages.nacionalPromotora);
            const nacionalShareInmobiliariaProyectado = calculateShareNacional(nacionalTotalsProyectado, percentages.nacionalInmobiliaria);
    
            // Aplicar porcentaje de Unidades de Apoyo a la UEN filtrada
            if (uenFilter.includes("Constructora")) {
                aplicarPorcentaje(nacionalShareConstructoraProyectado, rubrosDataProyectado);
            } else if (uenFilter.includes("Promotora")) {
                aplicarPorcentaje(nacionalSharePromotoraProyectado, rubrosDataProyectado);
            } else if (uenFilter.includes("Inmobiliaria")) {
                aplicarPorcentaje(nacionalShareInmobiliariaProyectado, rubrosDataProyectado);
            }

            // Aplicar distribución de otras zonas
            const otherZonesShareConstructoraProyectado = calculateShareExceptoNacional(exceptonacionalZoneTotalsProyectado, percentages.diferenteNacionalConstructora);
            const otherZonesSharePromotoraProyectado = calculateShareExceptoNacional(exceptonacionalZoneTotalsProyectado, percentages.diferenteNacionalPromotora);
            const otherZonesShareInmobiliariaProyectado = calculateShareExceptoNacional(exceptonacionalZoneTotalsProyectado, percentages.diferenteNacionalInmobiliaria);
    
            if (uenFilter.includes("Constructora")) {
                aplicarPorcentaje(otherZonesShareConstructoraProyectado, rubrosDataProyectado);
            } else if (uenFilter.includes("Promotora")) {
                aplicarPorcentaje(otherZonesSharePromotoraProyectado, rubrosDataProyectado);
            } else if (uenFilter.includes("Inmobiliaria")) {
                aplicarPorcentaje(otherZonesShareInmobiliariaProyectado, rubrosDataProyectado);
            }

            // Combinar rubros de zonas actualizadas
            Object.entries(zonasActualizadas).forEach(([zona, { rubros }]) => {
                Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
                    rubrosDataActualizado[rubroIndex] = {
                        total: (rubrosDataActualizado[rubroIndex]?.total || 0) + rubroData.total,
                    };
                });
            });

            const apoyoTotalZonasActualizadas = dataActual?.[year]?.["Unidades de Apoyo"]?.zones || {};
            const nacionalTotalsActualizadas = apoyoTotalZonasActualizadas.Nacional?.rubros || {};
            const exceptonacionalZoneTotalsActualizadas = Object.fromEntries(
                Object.entries(apoyoTotalZonasActualizadas).filter(([zones]) => zones !== "Nacional")
            );   

            const nacionalShareConstructoraActualizadas = calculateShareNacional(nacionalTotalsActualizadas, percentages.nacionalConstructora);
            const nacionalSharePromotoraActualizadas = calculateShareNacional(nacionalTotalsActualizadas, percentages.nacionalPromotora);
            const nacionalShareInmobiliariaActualizadas = calculateShareNacional(nacionalTotalsActualizadas, percentages.nacionalInmobiliaria);
    
            // Aplicar porcentaje de Unidades de Apoyo a la UEN filtrada
            if (uenFilter.includes("Constructora")) {
                aplicarPorcentaje(nacionalShareConstructoraActualizadas, rubrosDataActualizado);
            } else if (uenFilter.includes("Promotora")) {
                aplicarPorcentaje(nacionalSharePromotoraActualizadas, rubrosDataActualizado);
            } else if (uenFilter.includes("Inmobiliaria")) {
                aplicarPorcentaje(nacionalShareInmobiliariaActualizadas, rubrosDataActualizado);
            }
            // Aplicar distribución de otras zonas
            const otherZonesShareConstructoraActualizadas = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizadas, percentages.diferenteNacionalConstructora);
            const otherZonesSharePromotoraActualizadas = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizadas, percentages.diferenteNacionalPromotora);
            const otherZonesShareInmobiliariaActualizadas = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizadas, percentages.diferenteNacionalInmobiliaria);
    
            if (uenFilter.includes("Constructora")) {
                aplicarPorcentaje(otherZonesShareConstructoraActualizadas, rubrosDataActualizado);
            } else if (uenFilter.includes("Promotora")) {
                aplicarPorcentaje(otherZonesSharePromotoraActualizadas, rubrosDataActualizado);
            } else if (uenFilter.includes("Inmobiliaria")) {
                aplicarPorcentaje(otherZonesShareInmobiliariaActualizadas, rubrosDataActualizado);
            }

            // Función para distribuir valores de otras zonas
            function calculateShareNacional(totals, percentage) {
                return Object.entries(totals).reduce((acc, [zone, data]) => {
                    acc[zone] = { total: (data.total || 0) * percentage };
                    return acc;
                }, {});
            }

            // Función para distribuir valores de otras zonas a los rubros
            function calculateShareExceptoNacional(totals, percentage) {
                let sharedRubros = {};

                Object.entries(totals).forEach(([zone, zoneData]) => {
                    Object.entries(zoneData.rubros || {}).forEach(([rubroIndex, rubroData]) => {
                        if (!sharedRubros[rubroIndex]) {
                            sharedRubros[rubroIndex] = { total: 0 };
                        }
                        sharedRubros[rubroIndex].total += (rubroData.total || 0) * percentage;
                    });
                });

                return sharedRubros;
            }
            
            let costosVentaTotalProyectado = 0;
            let costosVentaTotalActualizado = 0;
    
            const proyectadoTotals = calculateTotalsProyectado(rubrosDataProyectado);
            const actualizadoTotals = calculateTotalsActualizado(rubrosDataActualizado);
    
            // Procesar los datos combinando "COSTOS DE VENTA" y "COSTOS INDIRECTOS"
            Object.entries(rubrosDataProyectado).forEach(([rubroIndex, { total: proyectadoTotal }]) => {
                const rubroNombre = updatedRubros?.[rubroIndex]?.nombre || "Rubro Desconocido";
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

    const CombinedrubroChartData = useMemo(() => {
        return generateCombinedRubroChartData(data, dataActual, updatedRubros);
    }, [data, dataActual, updatedRubros]);

    const CombinedsubrubroChartData = useMemo(() => {
        return generateCombinedSubrubroChartData(data, dataActual, updatedRubros);
    }, [data, dataActual, updatedRubros, rubroFilter]);
    
    const rubroChartData = useMemo(() => {
        return uenFilter ? generateRubroChartData() : [];
    }, [uenFilter, rubroFilter]);
    
    const subrubroChartData = useMemo(() => {
        return uenFilter ? generateSubrubroChartData() : [];
    }, [uenFilter, rubroFilter]);

    // Función para formatear números con separadores de miles
    const formatNumberWithCommas = (number) => {
        return new Intl.NumberFormat('es-ES').format(number);
    };

    const getRubroOptions = () => {
        const uniqueRubros = new Set();
        const rubroOptions = [];
    
        const processZones = (zones) => {
            Object.values(zones || {}).forEach(zone => {
                Object.keys(zone?.rubros || {}).forEach(rubro => {
                    if (!uniqueRubros.has(rubro)) {
                        uniqueRubros.add(rubro);
                        rubroOptions.push(
                            <option key={rubro} value={rubro}>
                                {updatedRubros?.[rubro]?.nombre}
                            </option>
                        );
                    }
                });
            });
        };
    
        if (uenFilter) {
            processZones(data?.[2025]?.[uenFilter]?.zones);
        } else {
            Object.values(data?.[2025] || {}).forEach(uen => processZones(uen?.zones));
        }
    
        return rubroOptions;
    };
    
    const renderBarChart = (chartData, title) => {
        const allValues = chartData.flatMap(item => [item.proyectado, item.actualizado, item.diferencia]);
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        const roundedMaxValue = Math.ceil(maxValue / 20000) * 20000;
        const roundedMinValue = Math.floor(minValue / 20000) * 20000;
        const domainMin = Math.min(0, roundedMinValue);
        const domainMax = Math.max(0, roundedMaxValue);
    
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                    marginBottom: "50px",
                    padding: "30px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
                }}
            >
                <h2 style={{ 
                    textAlign: "center", 
                    marginBottom: "20px", 
                    fontSize: "22px", 
                    color: "#1f2937", 
                    fontWeight: "600" 
                }}>
                    {title}
                </h2>
                <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={chartData} margin={{ top: 60, right: 20, left: 20, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="categoria"
                            type="category"
                            tick={{ fontSize: 12 }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={80}
                            tickLine={false}
                            axisLine={{ stroke: "#d1d5db" }}
                        />
                        <YAxis
                            tick={{ fontSize: 12 }}
                            width={80}
                            domain={[domainMin, domainMax]}
                            tickFormatter={(value) => formatNumberWithCommas(value)}
                            axisLine={{ stroke: "#d1d5db" }}
                            tickLine={false}
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: "8px", background: "#f9fafb", borderColor: "#e5e7eb" }} 
                            formatter={(value) => formatNumberWithCommas(value)} 
                            labelStyle={{ fontWeight: "bold", color: "#374151" }}
                        />
                        <Legend verticalAlign="top" height={40} />
                        <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="4 4" />
                        <Bar dataKey="proyectado" fill="#6366f1" radius={[4, 4, 0, 0]} name="Proyectado" />
                        <Bar dataKey="actualizado" fill="#10b981" radius={[4, 4, 0, 0]} name="Ejecutado" />
                        <Bar dataKey="diferencia" fill="#f97316" radius={[4, 4, 0, 0]} name="Diferencia" />
                    </BarChart>
                </ResponsiveContainer>
            </motion.div>
        );
    };
    
    const toTitleCase = (str) => {
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Layout principal
    return (
        <div style={{ display: "flex", flexDirection: "row", background: "#f1f5f9", minHeight: "100vh" }}>
            <Sidebar />
            <div style={{ flex: 1, padding: "30px", maxWidth: "1200px", margin: "0 auto" }}>
                {loading ? (
                    <LoadingModal open={loading} />
                ) : (
                    
                    <>
                        {/* Header */}
                        <div style={{ textAlign: "center", marginBottom: "30px" }}>
                            <h2 style={{ fontSize: "28px", fontWeight: "600", color: "#1f2937" }}>
                                📊 Gráfica Presupuesto Proyectado vs Ejecutado
                            </h2>
                        </div>
    
                        {/* Filtro de UEN */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
                            <select
                                value={uenFilter || ""}
                                onChange={(e) => {
                                    setUenFilter(e.target.value || null);
                                    setRubroFilter("");
                                }}
                                style={{
                                    padding: "10px 15px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "16px",
                                    background: "#ffffff",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                }}
                            >
                                <option value="">Selecciona una UEN</option>
                                {uenOptions.map((uen) => (
                                    <option key={uen} value={uen}>
                                        {uen}
                                    </option>
                                ))}
                            </select>
                        </div>
    
                        {/* Mostrar el combinado*/}
                        {!uenFilter && renderBarChart(CombinedrubroChartData, "Gráfica consolidado de todas las UEN")}

                        {/* Mostrar por UEN cuando hay selección */}
                        {uenFilter && renderBarChart(rubroChartData, `Gráfica por ${uenFilter}`)}
    
                        {/* Filtro de Rubro */}
                        <div style={{ margin: "30px 0", textAlign: "center" }}>
                            <select
                                id="rubro-select"
                                value={rubroFilter || ""}
                                onChange={(e) => setRubroFilter(e.target.value || "")}
                                style={{
                                    padding: "10px 15px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "16px",
                                    background: "#ffffff",
                                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                                }}
                            >
                                <option value="">Selecciona un Rubro</option>
                                {getRubroOptions()}
                            </select>
                        </div>
    
                        {rubroFilter && (
                            uenFilter
                                ? renderBarChart(
                                    subrubroChartData, 
                                    `Gráfica por ${toTitleCase(updatedRubros?.[rubroFilter]?.nombre || "Rubro")}`
                                )
                                : renderBarChart(
                                    CombinedsubrubroChartData, 
                                    `Gráfica por ${toTitleCase(updatedRubros?.[rubroFilter]?.nombre || "Rubro")}`
                                )
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default GraficaEjecutado;