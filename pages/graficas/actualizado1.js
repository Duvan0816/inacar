import React, { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { getCookie } from "../../src/utils/cookieUtils";
import { Accordion, AccordionDetails, AccordionSummary, Typography, FormGroup } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoadingModal from "@/components/loading";
import informeStyles from "../../src/styles/informe.js";

const GraficaActualizado = () => {
  const [data, setData] = useState([]);
  const [dataActual, setDataActual] = useState([]);
  const [updatedRubros, setUpdatedRubros] = useState([]);
  const [updatedRubrosActualizado, setUpdatedRubrosActualizado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para organizar los datos sin zonas, auxiliares ni cuentas
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

  // Función para cargar los datos
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

      // Organize data
      const organizedProyectado = organizeGenericData(proyectadoData, "zones", "rubros");
      const organizedActualizado = organizeGenericData(actualizadoData, "zones", "rubros");
  
      setUpdatedRubros(proyectadoData[0]?.updatedRubros || []);
      setUpdatedRubrosActualizado(actualizadoData[0]?.updatedRubros || []);
      setData(organizedProyectado);
      setDataActual(organizedActualizado);
  
      console.log("Organized data proyectado:", organizedProyectado);
      console.log("Organized data actualizado:", organizedActualizado);
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

  const renderData = (proyectadoData, actualizadoData) => {
    return Object.entries(actualizadoData).map(([year, uens]) => {
      const actualizedYearData = actualizadoData[year] || {};

      return (
        <div key={year}>
          <Accordion key={year} sx={{ marginBottom: "20px", width: "100%" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />} aria-controls={`panel-${year}-content`} id={`panel-${year}-header`} sx={{ background: "#a6a2a2" }}>
              <Typography sx={{ color: "white" }}>INFORME DETALLADO DE RESULTADOS {year}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexWrap: "wrap", overflow: "auto", width: "100%" }}>
                {Object.entries(uens).map(([uen, { total: uenTotal, rubros }]) => {
                  const actualizedRubros = actualizedYearData[uen]?.rubros || {};
                  const actualizadoTotals = calculateTotalsActualizado(actualizedRubros);
                  const proyectadoTotals = calculateTotalsProyectado(rubros);

                  return (
                    <div key={uen} style={{ flex: "1 1 20%", margin: "0.2px" }}>
                        <h4>
                            <div style={informeStyles.uen}>
                            <Typography variant="caption" sx={{ color: "white", width: "25%" }}>
                                {uen}:
                            </Typography>
                            <Typography variant="caption" sx={{ color: "white", width: "25%" }}>
                                {uenTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "white", width: "25%" }}>
                                {(actualizedYearData[uen]?.total || 0).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "white", width: "25%" }}>
                                {(uenTotal - (actualizedYearData[uen]?.total || 0)).toLocaleString("es-ES")}
                            </Typography>
                            </div>
                        </h4>
                        <div
                            style={uen == "Constructora"? informeStyles.containerConstructora: uen == "Inmobiliaria"? informeStyles.containerInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.containerUA: informeStyles.container}>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%",display: 'flex',alignItems: 'flex-start' }}>
                                Ingresos Operacionales:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.ingresosOperacionalesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.ingresosOperacionalesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.ingresosOperacionalesTotal  - actualizadoTotals.ingresosOperacionalesTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Costos Indirectos:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.costosIndirectosTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.costosIndirectosTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.costosIndirectosTotal - actualizadoTotals.costosIndirectosTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Costos de Venta:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.costosDeVentaTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.costosDeVentaTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.costosDeVentaTotal - actualizadoTotals.costosDeVentaTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div
                            style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Utilidad Bruta:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.utilidadBruta.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.utilidadBrutaActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.utilidadBruta - actualizadoTotals.utilidadBrutaActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Gastos de Administración:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.gastosOperacionalesAdministrativosTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.gastosOperacionalesAdministrativosTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.gastosOperacionalesAdministrativosTotal - actualizadoTotals.gastosOperacionalesAdministrativosTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Gastos de Comercialización:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.gastosOperacionalesComercialesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.gastosOperacionalesComercialesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.gastosOperacionalesComercialesTotal - actualizadoTotals.gastosOperacionalesComercialesTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div
                            style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Utilidad ó (PERDIDA) Operacional:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.utilidadoPerdidaOperacional.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.utilidadoPerdidaOperacionalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.utilidadoPerdidaOperacional - actualizadoTotals.utilidadoPerdidaOperacionalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Ingresos No Operacionales:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.ingresosNoOperacionalesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.ingresosNoOperacionalesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.ingresosNoOperacionalesTotal - actualizadoTotals.ingresosNoOperacionalesTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Gastos No Operacionales:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.gastosNoOperacionalesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.gastosNoOperacionalesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.gastosNoOperacionalesTotal - actualizadoTotals.gastosNoOperacionalesTotalActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                            <div
                            style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                Utilidad Antes De Impuesto:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {proyectadoTotals.utilidadAntesDeImpuesto.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {actualizadoTotals.utilidadAntesDeImpuestoActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                                {(proyectadoTotals.utilidadAntesDeImpuesto - actualizadoTotals.utilidadAntesDeImpuestoActualizado).toLocaleString('es-ES')}
                            </Typography>
                            </div>
                        </div>
                    </div>
                  );
                })}
              </div>
            </AccordionDetails>
          </Accordion>
        </div>
      );
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <Sidebar />
      <div style={{ display: "flex", width: "100%", flexDirection: "column" }}>
        {loading ? (
          <p>
            <LoadingModal open={loading} />
          </p>
        ) : (
          renderData(data, dataActual)
        )}
      </div>
    </div>
  );
};

export default GraficaActualizado;