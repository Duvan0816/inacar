import React, { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { getCookie } from "../../../src/utils/cookieUtils";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  FormGroup,

} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoadingModal from "@/components/loading";
import informeStyles from "../../../src/styles/informe.js";

const EjecutadoConsolidado = () => {
  const [data, setData] = useState([]); // For the first dataset
  const [dataActual, setDataActual] = useState([]); // For the second dataset
  const [updatedRubros, setUpdatedRubros] = useState([]);
  const [updatedRubrosActualizado, setUpdatedRubrosActualizado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
  
          if (!response.ok) {
            const errorText = await response.text();
            console.error("Error Response Text:", errorText);
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
  
          try {
            const data = await response.json();
            allData = [...allData, ...data.results];
            totalPages = Math.ceil(data.count / 3000);
          } catch (err) {
            console.error("Failed to parse JSON:", err);
            throw new Error("Invalid JSON response");
          }
  
          page++;
        } while (page <= totalPages);
  
        return allData;
      };
  
      // Fetch both datasets
      const [proyectadoData, actualizadoData] = await Promise.all([
        fetchDataset("InformeDetalladoPresupuesto"),
        fetchDataset("InformePresupuestoEjecutado"),
      ]);
  
      // Organize data
      const organizedProyectado = organizeGenericData(proyectadoData, "zones", "rubros");
      const organizedActualizado = organizeGenericData(actualizadoData, "zones", "rubros");
  
      setUpdatedRubros(proyectadoData[0]?.updatedRubros || []);
      setUpdatedRubrosActualizado(actualizadoData[0]?.updatedRubros || []);
      setData(organizedProyectado);
      setDataActual(organizedActualizado);

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

  const organizeGenericData = (data, zoneKey = "zones", rubroKey = "rubros") => {
    const organizedData = {};
  
    data.forEach((item) => {
      const year = new Date(item.fecha).getFullYear();
      const uen = item.uen || "Desconocido";
      const zone = item.cuenta?.regional || "Desconocido";
      const rubroIndex = item.rubro;
      const subrubroIndex = item.subrubro;
      const auxiliarIndex = item.auxiliar;
      const cuentaCodigo = item.cuenta?.codigo;
      const cuentaNombre = item.cuenta?.nombre?.trim() || "Sin nombre";
  
      const totalPresupuestoMes = item.meses_presupuesto?.reduce(
        (total, mes) => total + parseFloat(mes.presupuestomes || 0),
        0
      ) || 0;
  
      if (!organizedData[year]) organizedData[year] = {};
      if (!organizedData[year][uen]) organizedData[year][uen] = { total: 0, [zoneKey]: {} };
      if (!organizedData[year][uen][zoneKey][zone])
        organizedData[year][uen][zoneKey][zone] = { total: 0, [rubroKey]: {} };
      if (!organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex])
        organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex] = { total: 0, subrubros: {} };
  
      if (!organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex])
        organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex] = { total: 0, auxiliares: {} };
  
      if (!organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex])
        organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex] = { total: 0, cuentas: {} };
  
      const cuentaAgrupada = organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex].cuentas;
      if (!cuentaAgrupada[cuentaCodigo]) {
        cuentaAgrupada[cuentaCodigo] = { nombre: cuentaNombre, total: 0 };
      }
      cuentaAgrupada[cuentaCodigo].total += totalPresupuestoMes;
  
      organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex].total += totalPresupuestoMes;
      organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].subrubros[subrubroIndex].total += totalPresupuestoMes;
  
      if (rubroIndex === 3 && subrubroIndex === 14) {

      } else {
        // Agregar a los totales de rubro, zona y UEN si no es "HONORARIOS INTERNOS"
        organizedData[year][uen][zoneKey][zone][rubroKey][rubroIndex].total += totalPresupuestoMes;
        organizedData[year][uen][zoneKey][zone].total += totalPresupuestoMes;
        organizedData[year][uen].total += totalPresupuestoMes;
      }
    });
    return organizedData;
  };

  const calculateTotalsProyectado = (zones) => {
    const totals = {
      ingresosOperacionalesTotal: 0,
      costosIndirectosTotal: 0,
      costosDeVentaTotal: 0,
      gastosOperacionalesAdministrativosTotal: 0,
      gastosOperacionalesComercialesTotal: 0,
      ingresosNoOperacionalesTotal: 0,
      gastosNoOperacionalesTotal: 0,
    };
  
    Object.values(zones).forEach(({ rubros }) => {
      Object.entries(rubros || {}).forEach(([rubroIndex, rubroData]) => {
        const rubroName = updatedRubros?.[rubroIndex]?.nombre || "Unknown";
        const rubroTotal = rubroData.total || 0;
        
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
    });
  
    // Derived totals
    const utilidadBruta =
      totals.ingresosOperacionalesTotal - totals.costosDeVentaTotal - totals.costosIndirectosTotal;
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
    
  
  const calculateTotalsActualizado = (zones) => {
  
    let ingresosOperacionalesTotalActualizado = 0;
    let costosIndirectosTotalActualizado = 0;
    let costosDeVentaTotalActualizado = 0;
    let gastosOperacionalesAdministrativosTotalActualizado = 0;
    let gastosOperacionalesComercialesTotalActualizado = 0;
    let ingresosNoOperacionalesTotalActualizado = 0;
    let gastosNoOperacionalesTotalActualizado = 0;
  
    Object.values(zones).forEach(({ rubros }) => {
      Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
        const rubroName = updatedRubrosActualizado[rubroIndex]?.nombre || "Unknown";
        const rubroTotal = rubroData.total || 0;
    
        // Process totals based on rubroName
        if (rubroName === "INGRESOS OPERACIONALES") {
          ingresosOperacionalesTotalActualizado += rubroTotal;
        } else if (rubroName === "COSTOS INDIRECTOS") {
          costosIndirectosTotalActualizado += rubroTotal;
        } else if (rubroName === "COSTOS DE VENTA") {
          costosDeVentaTotalActualizado += rubroTotal;
        } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
          gastosOperacionalesAdministrativosTotalActualizado += rubroTotal;
        } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
          gastosOperacionalesComercialesTotalActualizado += rubroTotal;
        } else if (rubroName === "INGRESOS NO OPERACIONALES") {
          ingresosNoOperacionalesTotalActualizado += rubroTotal;
        } else if (rubroName === "GASTOS NO OPERACIONALES") {
          gastosNoOperacionalesTotalActualizado += rubroTotal;
        }
      });
    });    
  
    const utilidadBrutaActualizado =
      ingresosOperacionalesTotalActualizado -
      costosDeVentaTotalActualizado -
      costosIndirectosTotalActualizado;
  
    const utilidadoPerdidaOperacionalActualizado =
      utilidadBrutaActualizado -
      gastosOperacionalesAdministrativosTotalActualizado -
      gastosOperacionalesComercialesTotalActualizado;
  
    const utilidadAntesDeImpuestoActualizado =
      utilidadoPerdidaOperacionalActualizado +
      ingresosNoOperacionalesTotalActualizado -
      gastosNoOperacionalesTotalActualizado;
  
    return {
      gastosNoOperacionalesTotalActualizado,
      ingresosNoOperacionalesTotalActualizado,
      utilidadAntesDeImpuestoActualizado,
      ingresosOperacionalesTotalActualizado,
      costosIndirectosTotalActualizado,
      costosDeVentaTotalActualizado,
      utilidadBrutaActualizado,
      utilidadoPerdidaOperacionalActualizado,
      gastosOperacionalesAdministrativosTotalActualizado,
      gastosOperacionalesComercialesTotalActualizado,
    };
  };
  
  
  const calculateTotalsByZoneActualizado = (zones,updatedRubrosActualizado) => {
    const TotalsByZoneActualizado = {};

    // Iterate over zones and rubros to calculate totals by zone
    Object.entries(zones).forEach(([zoneName, { rubros }]) => {
      // Initialize totals object for the zone if it doesn't exist
      if (!TotalsByZoneActualizado[zoneName]) {
        TotalsByZoneActualizado[zoneName] = {
          zonaingresosOperacionalesTotalActualizado: 0,
          zonacostosIndirectosTotalActualizado: 0,
          zonacostosDeVentaTotalActualizado: 0,
          zonagastosOperacionalesAdministrativosTotalActualizado: 0,
          zonagastosOperacionalesComercialesTotalActualizado: 0,
          zonautilidadBrutaActualizado: 0,
          zonautilidadPerdidaOperacionalActualizado: 0,
          zonaingresosNoOperacionalesTotalActualizado: 0,
          zonagastosNoOperacionalesTotalActualizado: 0,
        };
      }

      // Check if rubros is defined
      if (rubros) {
        Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
          const rubroName = updatedRubrosActualizado[rubroIndex]?.nombre;

          if (rubroName === "INGRESOS OPERACIONALES") {
            TotalsByZoneActualizado[zoneName].zonaingresosOperacionalesTotalActualizado += rubroData.total;
          } else if (rubroName === "COSTOS INDIRECTOS") {
            TotalsByZoneActualizado[zoneName].zonacostosIndirectosTotalActualizado += rubroData.total;
          } else if (rubroName === "COSTOS DE VENTA") {
            TotalsByZoneActualizado[zoneName].zonacostosDeVentaTotalActualizado += rubroData.total;
          } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            TotalsByZoneActualizado[zoneName].zonagastosOperacionalesAdministrativosTotalActualizado +=rubroData.total;
          } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            TotalsByZoneActualizado[zoneName].zonagastosOperacionalesComercialesTotalActualizado +=rubroData.total;
          } else if (rubroName === "INGRESOS NO OPERACIONALES") {
            TotalsByZoneActualizado[zoneName].zonaingresosNoOperacionalesTotalActualizado += rubroData.total;
          } else if (rubroName === "GASTOS NO OPERACIONALES") {
            TotalsByZoneActualizado[zoneName].zonagastosNoOperacionalesTotalActualizado += rubroData.total;
          }
        });
      }

      // Calculate gross profit and operational loss or profit for the current zone
      TotalsByZoneActualizado[zoneName].zonautilidadBrutaActualizado =
        TotalsByZoneActualizado[zoneName].zonaingresosOperacionalesTotalActualizado -
        TotalsByZoneActualizado[zoneName].zonacostosDeVentaTotalActualizado -
        TotalsByZoneActualizado[zoneName].zonacostosIndirectosTotalActualizado;

      TotalsByZoneActualizado[zoneName].zonautilidadPerdidaOperacionalActualizado =
        TotalsByZoneActualizado[zoneName].zonautilidadBrutaActualizado -
        TotalsByZoneActualizado[zoneName].zonagastosOperacionalesAdministrativosTotalActualizado -
        TotalsByZoneActualizado[zoneName].zonagastosOperacionalesComercialesTotalActualizado;

      TotalsByZoneActualizado[zoneName].zonautilidadAntesDeImpuestoActualizado =
        TotalsByZoneActualizado[zoneName].zonautilidadPerdidaOperacionalActualizado +
        TotalsByZoneActualizado[zoneName].zonaingresosNoOperacionalesTotalActualizado - 
        TotalsByZoneActualizado[zoneName].zonagastosNoOperacionalesTotalActualizado;
    });

    return TotalsByZoneActualizado;
  };

  const calculateTotalsByZoneProyectado = (zones, updatedRubros) => {
    const totalsByZone = {};

    // Iterate over zones and rubros to calculate totals by zone
    Object.entries(zones).forEach(([zoneName, { rubros }]) => {
      // Initialize totals object for the zone if it doesn't exist
      if (!totalsByZone[zoneName]) {
        totalsByZone[zoneName] = {
          zonaingresosOperacionalesTotal: 0,
          zonacostosIndirectosTotal: 0,
          zonacostosDeVentaTotal: 0,
          zonagastosOperacionalesAdministrativosTotal: 0,
          zonagastosOperacionalesComercialesTotal: 0,
          zonautilidadBruta: 0,
          zonautilidadPerdidaOperacional: 0,
          zonaingresosNoOperacionalesTotal: 0,
          zonagastosNoOperacionalesTotal: 0,
        };
      }

      // Check if rubros is defined
      if (rubros) {
        Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
          const rubroName = updatedRubros[rubroIndex]?.nombre;

          if (rubroName === "INGRESOS OPERACIONALES") {
            totalsByZone[zoneName].zonaingresosOperacionalesTotal +=rubroData.total;
          } else if (rubroName === "COSTOS INDIRECTOS") {
            totalsByZone[zoneName].zonacostosIndirectosTotal += rubroData.total;
          } else if (rubroName === "COSTOS DE VENTA") {
            totalsByZone[zoneName].zonacostosDeVentaTotal += rubroData.total;
          } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            totalsByZone[zoneName].zonagastosOperacionalesAdministrativosTotal += rubroData.total;
          } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            totalsByZone[zoneName].zonagastosOperacionalesComercialesTotal += rubroData.total;
          } else if (rubroName === "INGRESOS NO OPERACIONALES") {
            totalsByZone[zoneName].zonaingresosNoOperacionalesTotal += rubroData.total;
          } else if (rubroName === "GASTOS NO OPERACIONALES") {
            totalsByZone[zoneName].zonagastosNoOperacionalesTotal += rubroData.total;
          }
        });
      }

      // Calculate gross profit and operational loss or profit for the current zone
      totalsByZone[zoneName].zonautilidadBruta =
        totalsByZone[zoneName].zonaingresosOperacionalesTotal -
        totalsByZone[zoneName].zonacostosDeVentaTotal -
        totalsByZone[zoneName].zonacostosIndirectosTotal;

      totalsByZone[zoneName].zonautilidadPerdidaOperacional =
        totalsByZone[zoneName].zonautilidadBruta -
        totalsByZone[zoneName].zonagastosOperacionalesAdministrativosTotal -
        totalsByZone[zoneName].zonagastosOperacionalesComercialesTotal;

      totalsByZone[zoneName].zonautilidadAntesDeImpuesto =
        totalsByZone[zoneName].zonautilidadPerdidaOperacional +
        totalsByZone[zoneName].zonaingresosNoOperacionalesTotal -
        totalsByZone[zoneName].zonagastosNoOperacionalesTotal;
    });

    return totalsByZone;
  };

  const renderData = (proyectadoData, actualizadoData) => {
    return Object.entries(proyectadoData).map(([year, uens]) => {
      const actualizedYearData = actualizadoData[year] || {};

      return (
        <div key={year}>
          <Accordion key={year} sx={{ marginBottom: "20px", width: "200%" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}aria-controls={`panel-${year}-content`}id={`panel-${year}-header`}sx={{ background: "#a6a2a2" }}>
              <Typography sx={{ color: "white" }}>
                INFORME DETALLADO DE RESULTADOS {year}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{display: "flex",flexWrap: "wrap",overflow: "auto",width: "100%",}}>
                  {Object.entries(uens).map(([uen, { total: uenTotal, zones }]) => {
                    const actualizedZones = actualizedYearData[uen]?.zones || {};
                    const proyectadoTotals = calculateTotalsProyectado(zones); 
                    const actualizadoTotals = calculateTotalsActualizado(actualizedZones);
                    const totalsByZone = calculateTotalsByZoneProyectado(
                      zones,
                      updatedRubros
                    );
                    const TotalsByZoneActualizado = calculateTotalsByZoneActualizado(
                      actualizedZones,
                      updatedRubrosActualizado
                    );

                    return (
                      <div key={uen}style={{ flex: "1 1 20%", margin: "0.2px" }}>
                        <div style={informeStyles.textContent}>
                          <Typography variant="caption"style={{ width: "25%" }}>
                            Detalle
                          </Typography>
                          <Typography variant="caption"style={{ width: "25%" }}>
                            Proyectado
                          </Typography>
                          <Typography variant="caption"style={{ width: "25%" }}>
                            Ejecutado
                          </Typography>
                          <Typography variant="caption"style={{ width: "25%" }}>
                            Diferencia
                          </Typography>
                        </div>
                        <h4>
                          <div
                            style={uen == "Constructora"? informeStyles.uenConstructora: uen == "Inmobiliaria"? informeStyles.uenInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.uenUA: informeStyles.uen}>
                            <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                              {uen}:
                            </Typography>
                            <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                              {uenTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                              {(actualizedYearData[uen]?.total || 0).toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                              {(uenTotal - (actualizedYearData[uen]?.total || 0)).toLocaleString('es-ES')}
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
                        {Object.entries(zones).map(
                          ([zone, { total: zoneTotal, rubros }]) => (
                            <div key={zone}>
                              <h5>
                                <div style={uen == "Constructora"? informeStyles.uenConstructora: uen == "Inmobiliaria"? informeStyles.uenInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.uenUA: informeStyles.uen}>
                                  <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                                    {zone}:
                                  </Typography>
                                  <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                                    {zoneTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                  </Typography>
                                  <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                                    {(actualizedZones[zone]?.total || 0).toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                  </Typography>
                                  <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                                    {(zoneTotal - (actualizedZones[zone]?.total || 0)).toLocaleString('es-ES')}
                                  </Typography>
                                </div>
                              </h5>
                                <div
                                  style={uen == "Constructora"? informeStyles.containerConstructora: uen == "Inmobiliaria"? informeStyles.containerInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.containerUA: informeStyles.container}>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Ingresos Operacionales:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonaingresosOperacionalesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0, maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonaingresosOperacionalesTotalActualizado?.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonaingresosOperacionalesTotal - TotalsByZoneActualizado[zone]?.zonaingresosOperacionalesTotalActualizado  || 0).toLocaleString('es-ES')}
                                    </Typography>
                                  </div>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Costos Indirectos:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonacostosIndirectosTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonacostosIndirectosTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonacostosIndirectosTotal - TotalsByZoneActualizado[zone]?.zonacostosIndirectosTotalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Costos de Venta:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonacostosDeVentaTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonacostosDeVentaTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonacostosDeVentaTotal - TotalsByZoneActualizado[zone]?.zonacostosDeVentaTotalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div
                                    style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Utilidad Bruta:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonautilidadBruta.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonautilidadBrutaActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonautilidadBruta - TotalsByZoneActualizado[zone]?.zonautilidadBrutaActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Gastos de Administración:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonagastosOperacionalesAdministrativosTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonagastosOperacionalesAdministrativosTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonagastosOperacionalesAdministrativosTotal - TotalsByZoneActualizado[zone]?.zonagastosOperacionalesAdministrativosTotalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Gastos de Comercialización:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonagastosOperacionalesComercialesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonagastosOperacionalesComercialesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonagastosOperacionalesComercialesTotal - TotalsByZoneActualizado[zone]?.zonagastosOperacionalesComercialesTotalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div
                                    style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Utilidad ó (PERDIDA) Operacional:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonautilidadPerdidaOperacional.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonautilidadPerdidaOperacionalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonautilidadPerdidaOperacional - TotalsByZoneActualizado[zone]?.zonautilidadPerdidaOperacionalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Ingresos No Operacionales:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonaingresosNoOperacionalesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonaingresosNoOperacionalesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonaingresosNoOperacionalesTotal - TotalsByZoneActualizado[zone]?.zonaingresosNoOperacionalesTotalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div style={informeStyles.textContent}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Gastos No Operacionales:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonagastosNoOperacionalesTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonagastosNoOperacionalesTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonagastosNoOperacionalesTotal - TotalsByZoneActualizado[zone]?.zonagastosNoOperacionalesTotalActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                  <div
                                    style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      Utilidad Antes De Impuesto:
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {totalsByZone[zone].zonautilidadAntesDeImpuesto.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {TotalsByZoneActualizado[zone]?.zonautilidadAntesDeImpuestoActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                    </Typography>
                                    <Typography variant="caption"style={{ width: "25%" }}>
                                      {(totalsByZone[zone].zonautilidadAntesDeImpuesto - TotalsByZoneActualizado[zone]?.zonautilidadAntesDeImpuestoActualizado || 0).toLocaleString("es-ES")}
                                    </Typography>
                                  </div>
                                </div>
                            </div>
                          )
                        )}
                      </div>
                    );
                  }
                )}
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
        <div
          style={{display: "flex",flexDirection: "row",marginBottom: "10px",justifyContent: "flex-end",alignItems: "center",}}>
          <FormGroup sx={{display: "flex",flexDirection: "row",justifyContent: "flex-end",}}>
          </FormGroup>
        </div>

        {loading ? (
          <p><LoadingModal open={loading} /></p>
        ) : (renderData(data, dataActual))}
      </div>
    </div>
  );
};

export default EjecutadoConsolidado;