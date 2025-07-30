import React, { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from "@/components/sidebar";
import { getCookie } from "@/utils/cookieUtils";
import { Typography, Box } from "@mui/material";
import LoadingModal from "@/components/loading";
import { motion } from "framer-motion";

const GraficaEscrituracionProyectos = () => {
  const anioActual = 2025;

  const [loading, setLoading] = useState(true);
  const [proyectado, setProyectado] = useState([]);
  const [ejecutado, setEjecutado] = useState([]);

  const fetchEscrituracionData = async (parametro) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const csrftoken = getCookie("csrftoken");
    const token = localStorage.getItem("token");

    const response = await fetch(`${API_URL}/escrituracionList/?parametro=${parametro}&anio=${anioActual}`, {
      method: "GET",
      headers: {
        "X-CSRFToken": csrftoken,
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) throw new Error("Error cargando datos");
    return response.json();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [proy, ejec] = await Promise.all([
          fetchEscrituracionData("PROYECTADO"),
          fetchEscrituracionData("EJECUTADO"),
        ]);
        setProyectado(proy.results);
        setEjecutado(ejec.results);
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    const dataMap = {};

    // Agrega Proyectado
    proyectado.forEach(item => {
      const key = `${item.centro_costo.codigo} ${item.centro_costo.nombre}`;
      if (!dataMap[key]) dataMap[key] = { proyecto: key, proyectado: 0, ejecutado: 0, undProy: 0, undEjec: 0 };
      dataMap[key].proyectado += parseFloat(item.valor);
      dataMap[key].undProy += item.unidades;
    });

    // Agrega Ejecutado
    ejecutado.forEach(item => {
      const key = `${item.centro_costo.codigo} ${item.centro_costo.nombre}`;
      if (!dataMap[key]) dataMap[key] = { proyecto: key, proyectado: 0, ejecutado: 0, undProy: 0, undEjec: 0 };
      dataMap[key].ejecutado += parseFloat(item.valor);
      dataMap[key].undEjec += item.unidades;
    });

    // Calcular diferencia y transformar valores a millones
    return Object.values(dataMap).map(item => ({
      proyecto: item.proyecto,
      proyectadoMM: (item.proyectado / 1_000_000).toFixed(2),
      ejecutadoMM: (item.ejecutado / 1_000_000).toFixed(2),
      diferenciaMM: ((item.proyectado - item.ejecutado) / 1_000_000).toFixed(2),
      undProy: item.undProy,
      undEjec: item.undEjec,
      diferenciaUnd: item.undProy - item.undEjec,
    }));
  }, [proyectado, ejecutado]);

  const renderBarChart = (dataKey1, dataKey2, dataKeyDiff, label1, label2, labelDiff, title, suffix = "") => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{ background: "#fff", borderRadius: "12px", padding: "20px", marginBottom: "30px", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)" }}
    >
      <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 600 }}>{title}</Typography>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="proyecto" angle={-10} textAnchor="end" height={80} />
          <YAxis />
          <Tooltip formatter={(value) => `${value}${suffix}`} />
          <Legend />
          <Bar dataKey={dataKey1} fill="#1976d2" name={label1} />
          <Bar dataKey={dataKey2} fill="#2e7d32" name={label2} />
          <Bar dataKey={dataKeyDiff} fill="#ff9800" name={labelDiff} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "row", background: "#f1f5f9", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
        {loading ? (
          <LoadingModal open={loading} />
        ) : (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              📊 Total por Proyecto - Escrituración {anioActual}
            </Typography>

            {/* Gráfica de Valores por Proyecto */}
            {renderBarChart(
              "proyectadoMM", "ejecutadoMM", "diferenciaMM",
              "Valor Proyectado (MM)", "Valor Ejecutado (MM)", "Diferencia (MM)",
              "Valor Total por Proyecto (Millones)", " MM"
            )}

            {/* Gráfica de Unidades por Proyecto */}
            {renderBarChart(
              "undProy", "undEjec", "diferenciaUnd",
              "UND Proyectadas", "UND Ejecutadas", "Diferencia UND",
              "UND Total por Proyecto"
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GraficaEscrituracionProyectos;
