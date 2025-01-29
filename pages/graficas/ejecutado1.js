import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
    const [error, setError] = useState(null);

    const organizeGenericData = (data) => {
        const organizedData = {};
        data.forEach((item) => {
            const year = new Date(item.fecha).getFullYear();
            const uen = item.uen || "Desconocido";
            const rubroIndex = item.rubro;
            const subrubroIndex = item.subrubro;

            const totalPresupuestoMes = item.meses_presupuesto?.reduce(
                (total, mes) => total + parseFloat(mes.presupuestomes || 0),
                0
            ) || 0;

            if (!organizedData[year]) organizedData[year] = {};
            if (!organizedData[year][uen]) organizedData[year][uen] = { total: 0, rubros: {} };
            if (!organizedData[year][uen].rubros[rubroIndex])
                organizedData[year][uen].rubros[rubroIndex] = { total: 0, subrubros: {} };

            if (!organizedData[year][uen].rubros[rubroIndex].subrubros[subrubroIndex])
                organizedData[year][uen].rubros[rubroIndex].subrubros[subrubroIndex] = { total: 0 };

            organizedData[year][uen].rubros[rubroIndex].subrubros[subrubroIndex].total += totalPresupuestoMes;
            organizedData[year][uen].rubros[rubroIndex].total += totalPresupuestoMes;
            organizedData[year][uen].total += totalPresupuestoMes;
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
                fetchDataset("InformeDetalladoPresupuesto"),
                fetchDataset("Actualizado"),
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

    const generateRubroChartData = () => {
        const chartData = [];
        Object.entries(data).forEach(([year, uens]) => {
            if (!uenFilter) return;

            const rubrosDataProyectado = uens[uenFilter]?.rubros || {};
            const rubrosDataActualizado = dataActual[year]?.[uenFilter]?.rubros || {};

            Object.entries(rubrosDataProyectado).forEach(([rubroIndex, { total: proyectadoTotal }]) => {
                const rubroNombre = updatedRubros?.[rubroIndex]?.nombre || updatedRubrosActualizado?.[rubroIndex]?.nombre || "Rubro Desconocido";
                const actualizadoTotal = rubrosDataActualizado?.[rubroIndex]?.total || 0;
                const diferenciaTotal = (proyectadoTotal - actualizadoTotal) || 0;

                chartData.push({
                    year,
                    categoria: rubroNombre,
                    proyectado: (proyectadoTotal || 0 / 1_000_000).toFixed(0),
                    actualizado: (actualizadoTotal / 1_000_000).toFixed(0), 
                    diferencia: (diferenciaTotal / 1_000_000).toFixed(0),
                });
            });
        });

        return chartData;
    };

    const generateSubrubroChartData = () => {
        const chartData = [];
        Object.entries(data).forEach(([year, uens]) => {
            if (!uenFilter || !rubroFilter) return;

            const subrubrosDataProyectado = uens[uenFilter]?.rubros[rubroFilter]?.subrubros || {};
            const subrubrosDataActualizado = dataActual[year]?.[uenFilter]?.rubros[rubroFilter]?.subrubros || {};
            
            const subrubrosList =
            updatedRubros[rubroFilter]?.subrubros ||
            updatedRubrosActualizado[rubroFilter]?.subrubros ||
            [];
            
            Object.entries(subrubrosDataProyectado).forEach(([subrubroIndex, { total: proyectadoTotal }]) => {
                const subrubro = subrubrosList[subrubroIndex]; 
                const subrubroNombre = subrubro.nombre || "Subrubro Desconocido";
                const actualizadoTotal = subrubrosDataActualizado?.[subrubroIndex]?.total || 0;
                const diferenciaTotal = (proyectadoTotal - actualizadoTotal) || 0;

                chartData.push({
                    year,
                    categoria: subrubroNombre,
                    proyectado: (proyectadoTotal || 0 / 1_000_000).toFixed(0),
                    actualizado: (actualizadoTotal / 1_000_000).toFixed(0), 
                    diferencia: (diferenciaTotal / 1_000_000).toFixed(0),
                });
            });
        });

        return chartData;
    };

    const renderBarChart = (chartData, title) => (
        <div style={{ marginBottom: "40px" }}>
            <h2 style={{ textAlign: "center" }}>{title}</h2>
            <ResponsiveContainer width="100%" height={500}>
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="categoria"
                        type="category"
                        tick={{ fontSize: 10, angle: -5 }}
                        interval={0}
                        height={100}
                    />
                    <YAxis tick={{ fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="proyectado" fill="#8884d8" name="Proyectado" />
                    <Bar dataKey="actualizado" fill="#82ca9d" name="Actualizado" />
                    <Bar dataKey="diferencia" fill="#ff7300" name="Diferencia" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "row" }}>
            <Sidebar />
            <div style={{ display: "flex", width: "100%", flexDirection: "column" }}>
                {loading ? (
                    <LoadingModal open={loading} />
                ) : (
                    <>
                        <h2 style={{ textAlign: "center" }}>Gráficas por UEN</h2>

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
                        {uenFilter && renderBarChart(rubroChartData)}

                        <h2 style={{ textAlign: "center" }}>Gráfica por Rubro</h2>

                        {/* Filtro por Rubro */}
                        {uenFilter && (
                            console.log("Data completa:", data),
                            console.log("UEN seleccionado:", uenFilter),
                            
                            <div style={{ margin: "20px 0", textAlign: "center" }}>
                                <label htmlFor="rubro-select">Selecciona un Rubro: </label>
                                <select
                                id="rubro-select"
                                value={rubroFilter || ""}
                                onChange={(e) => setRubroFilter(e.target.value || null)}
                                >
                                <option value="">Seleccionar</option>
                                {Object.keys(data?.[2025]?.[uenFilter]?.rubros || {}).map((rubro) => (
                                    <option key={rubro} value={rubro}>
                                        {updatedRubros[rubro]?.nombre}
                                    </option>
                                ))}
                                </select>
                            </div>
                        )}

                        {/* Gráficas Rubro*/}
                        {uenFilter && rubroFilter && renderBarChart(subrubroChartData)}
                    </>
                )}
            </div>
        </div>
    );
};

export default GraficaActualizado;