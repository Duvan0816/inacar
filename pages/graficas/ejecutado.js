import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts';
import Sidebar from "@/components/sidebar";
import LoadingModal from "@/components/loading";
import { getCookie } from "../../src/utils/cookieUtils";

const GraficaEjecutado = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uenFilter, setUenFilter] = useState(null);
    const [rubroFilter, setRubroFilter] = useState(null);
    const [uenOptions, setUenOptions] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const csrftoken = getCookie("csrftoken");
            const token = localStorage.getItem("token");
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${API_URL}/InformePresupuestoEjecutado/`, {
                headers: {
                    "X-CSRFToken": csrftoken,
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) throw new Error(`Error en la carga de datos: ${response.status}`);

            const data = await response.json();
            setData(data.results);
            setUenOptions([...new Set(data.results.map(item => item.uen))]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (uenFilter) {
            setChartData(data.filter(item => item.uen === uenFilter));
        } else {
            setChartData(data);
        }
    }, [uenFilter, data]);

    return (
        <div className="flex flex-row min-h-screen bg-gray-100">
            <Sidebar />
            <div className="flex flex-col w-full p-6">
                {loading ? (
                    <LoadingModal open={loading} />
                ) : (
                    <>
                        <h2 className="text-2xl font-semibold text-center text-gray-800">Gráfica de Presupuesto Ejecutado</h2>
                        <div className="flex justify-center mt-4">
                            <select
                                className="p-2 border rounded-lg shadow-sm bg-white"
                                value={uenFilter || ""}
                                onChange={(e) => setUenFilter(e.target.value || null)}
                            >
                                <option value="">Seleccionar UEN</option>
                                {uenOptions.map(uen => (
                                    <option key={uen} value={uen}>{uen}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="categoria" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <ReferenceLine y={0} stroke="#000" />
                                    <Bar dataKey="proyectado" fill="#8884d8" name="Proyectado">
                                        <LabelList dataKey="proyectado" position="top" />
                                    </Bar>
                                    <Bar dataKey="actualizado" fill="#82ca9d" name="Ejecutado">
                                        <LabelList dataKey="actualizado" position="top" />
                                    </Bar>
                                    <Bar dataKey="diferencia" fill="#ff7300" name="Diferencia">
                                        <LabelList dataKey="diferencia" position="top" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GraficaEjecutado;