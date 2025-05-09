import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/sidebar";
import { getCookie } from "../../../src/utils/cookieUtils";
import {Accordion,AccordionDetails,AccordionSummary,Typography,FormGroup,Checkbox,FormControlLabel,Button,} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoadingModal from "@/components/loading";
import informeStyles from "../../../src/styles/informe.js";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const csrftoken = getCookie("csrftoken");

/* =======================
   Funciones Auxiliares
   ======================= */
const calculateShareExceptoNacional = (totals, percentage) =>
  Object.keys(totals).reduce((acc, zone) => {
    acc[zone] = Object.fromEntries(
      Object.entries(totals[zone]).map(([key, value]) => [key, (value || 0) * percentage])
    );
    return acc;
  }, {});

const calculateShareExceptoNacionalFinal = (totals, percentage) =>
  Object.entries(totals).reduce((acc, [zone, data]) => {
    acc[zone] = { total: (data.total || 0) * percentage };
    return acc;
  }, {});

const calculateShare = (totals, percentage) =>
  Object.keys(totals).reduce((acc, key) => {
    acc[key] = (totals[key] || 0) * percentage;
    return acc;
  }, {});

const calculateShareFinal = (totals, percentage) => ({
  total: (totals.total || 0) * percentage,
});

const sumZonesForUEN = (zoneShare) => {
  const uenTotal = {};
  Object.keys(zoneShare).forEach((zone) => {
    Object.entries(zoneShare[zone]).forEach(([key, value]) => {
      uenTotal[key] = (uenTotal[key] || 0) + (value || 0);
    });
  });
  return uenTotal;
};

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

const EjecutadoConsolidado = () => {
  // Estados para datasets y rubros
  const [data, setData] = useState([]);
  const [dataActual, setDataActual] = useState([]);
  const [updatedRubros, setUpdatedRubros] = useState([]);
  const [updatedRubrosActualizado, setUpdatedRubrosActualizado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);

  const handleMonthToggle = (monthIndex) => {
    setSelectedMonths((prev) =>
      prev.includes(monthIndex)
        ? prev.filter((m) => m !== monthIndex)
        : [...prev, monthIndex]
    );
  };
  
  const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  
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
    const response = await fetch(`${API_URL}/${endpoint}`, {
      headers: {
        "X-CSRFToken": csrftoken,
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  };

  // Función para obtener todos los datos
  const fetchData = async () => {
    try {
      setLoading(true);
      const mesesQuery = selectedMonths.length > 0
      ? `?meses=${selectedMonths.join(",")}`
      : "";
      const [proyectadoData, actualizadoData] = await Promise.all([
        fetchDataset(`InformeDetalladoPresupuesto${mesesQuery}`),
        fetchDataset(`InformePresupuestoEjecutado${mesesQuery}`),
        
      ]);
      setData(proyectadoData);
      setDataActual(actualizadoData);
      const rubrosData = await fetchRubrosData();
      setUpdatedRubros(rubrosData);
      setUpdatedRubrosActualizado(rubrosData);
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

  // Funciones para calcular totales
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
    const costosDeVentacostosIndirectosTotal = (totals.costosDeVentaTotal || 0) + (totals.costosIndirectosTotal || 0);
    const utilidadBruta = (totals.ingresosOperacionalesTotal || 0) - (totals.costosDeVentaTotal || 0) - (totals.costosIndirectosTotal || 0);
    const utilidadoPerdidaOperacional = utilidadBruta - (totals.gastosOperacionalesAdministrativosTotal || 0) - (totals.gastosOperacionalesComercialesTotal || 0);
    const utilidadAntesDeImpuesto = utilidadoPerdidaOperacional + (totals.ingresosNoOperacionalesTotal || 0) - (totals.gastosNoOperacionalesTotal || 0);
    return { 
      ...totals, 
      utilidadBruta, 
      utilidadoPerdidaOperacional, 
      utilidadAntesDeImpuesto, 
      costosDeVentacostosIndirectosTotal 
    };
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
      Object.entries(rubros || {}).forEach(([rubroIndex, rubroData]) => {
        const rubroName = updatedRubrosActualizado?.[rubroIndex]?.nombre || "Unknown";
        const rubroTotal = rubroData.total || 0;
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
    const costosDeVentacostosIndirectosTotalActualizado = (costosDeVentaTotalActualizado || 0) + (costosIndirectosTotalActualizado || 0);
    const utilidadBrutaActualizado = ingresosOperacionalesTotalActualizado - costosDeVentaTotalActualizado - costosIndirectosTotalActualizado;
    const utilidadoPerdidaOperacionalActualizado = utilidadBrutaActualizado - gastosOperacionalesAdministrativosTotalActualizado - gastosOperacionalesComercialesTotalActualizado;
    const utilidadAntesDeImpuestoActualizado = utilidadoPerdidaOperacionalActualizado + ingresosNoOperacionalesTotalActualizado - gastosNoOperacionalesTotalActualizado;
    return {
      costosDeVentacostosIndirectosTotalActualizado,
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

  const calculateTotalsByZoneActualizado = (zones) => {
    const TotalsByZoneActualizado = {};
    Object.entries(zones).forEach(([zone, { rubros }]) => {
      if (!TotalsByZoneActualizado[zone]) {
        TotalsByZoneActualizado[zone] = {
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
      if (rubros) {
        Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
          const rubroName = updatedRubrosActualizado?.[rubroIndex]?.nombre || "";
          if (rubroName === "INGRESOS OPERACIONALES") {
            TotalsByZoneActualizado[zone].zonaingresosOperacionalesTotalActualizado += rubroData.total || 0;
          } else if (rubroName === "COSTOS INDIRECTOS") {
            TotalsByZoneActualizado[zone].zonacostosIndirectosTotalActualizado += rubroData.total || 0;
          } else if (rubroName === "COSTOS DE VENTA") {
            TotalsByZoneActualizado[zone].zonacostosDeVentaTotalActualizado += rubroData.total || 0;
          } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            TotalsByZoneActualizado[zone].zonagastosOperacionalesAdministrativosTotalActualizado += rubroData.total || 0;
          } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            TotalsByZoneActualizado[zone].zonagastosOperacionalesComercialesTotalActualizado += rubroData.total || 0;
          } else if (rubroName === "INGRESOS NO OPERACIONALES") {
            TotalsByZoneActualizado[zone].zonaingresosNoOperacionalesTotalActualizado += rubroData.total || 0;
          } else if (rubroName === "GASTOS NO OPERACIONALES") {
            TotalsByZoneActualizado[zone].zonagastosNoOperacionalesTotalActualizado += rubroData.total || 0;
          }
        });
      }
      TotalsByZoneActualizado[zone].zonacostosDeVentacostosIndirectosTotalActualizado =
        (TotalsByZoneActualizado[zone].zonacostosDeVentaTotalActualizado || 0) +
        (TotalsByZoneActualizado[zone].zonacostosIndirectosTotalActualizado || 0);
      TotalsByZoneActualizado[zone].zonautilidadBrutaActualizado =
        TotalsByZoneActualizado[zone].zonaingresosOperacionalesTotalActualizado -
        TotalsByZoneActualizado[zone].zonacostosDeVentaTotalActualizado -
        TotalsByZoneActualizado[zone].zonacostosIndirectosTotalActualizado;
      TotalsByZoneActualizado[zone].zonautilidadPerdidaOperacionalActualizado =
        TotalsByZoneActualizado[zone].zonautilidadBrutaActualizado -
        TotalsByZoneActualizado[zone].zonagastosOperacionalesAdministrativosTotalActualizado -
        TotalsByZoneActualizado[zone].zonagastosOperacionalesComercialesTotalActualizado;
      TotalsByZoneActualizado[zone].zonautilidadAntesDeImpuestoActualizado =
        TotalsByZoneActualizado[zone].zonautilidadPerdidaOperacionalActualizado +
        TotalsByZoneActualizado[zone].zonaingresosNoOperacionalesTotalActualizado -
        TotalsByZoneActualizado[zone].zonagastosNoOperacionalesTotalActualizado;
    });
    return TotalsByZoneActualizado;
  };

  const calculateTotalsByZoneProyectado = (zones) => {
    const totalsByZone = {};
    Object.entries(zones).forEach(([zone, { rubros }]) => {
      if (!totalsByZone[zone]) {
        totalsByZone[zone] = {
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
      if (rubros) {
        Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
          const rubroName = updatedRubros?.[rubroIndex]?.nombre || "";
          if (rubroName === "INGRESOS OPERACIONALES") {
            totalsByZone[zone].zonaingresosOperacionalesTotal += rubroData.total || 0;
          } else if (rubroName === "COSTOS INDIRECTOS") {
            totalsByZone[zone].zonacostosIndirectosTotal += rubroData.total || 0;
          } else if (rubroName === "COSTOS DE VENTA") {
            totalsByZone[zone].zonacostosDeVentaTotal += rubroData.total || 0;
          } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            totalsByZone[zone].zonagastosOperacionalesAdministrativosTotal += rubroData.total || 0;
          } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            totalsByZone[zone].zonagastosOperacionalesComercialesTotal += rubroData.total || 0;
          } else if (rubroName === "INGRESOS NO OPERACIONALES") {
            totalsByZone[zone].zonaingresosNoOperacionalesTotal += rubroData.total || 0;
          } else if (rubroName === "GASTOS NO OPERACIONALES") {
            totalsByZone[zone].zonagastosNoOperacionalesTotal += rubroData.total || 0;
          }
        });
      }
      totalsByZone[zone].zonacostosDeVentacostosIndirectosTotal =
        (totalsByZone[zone].zonacostosDeVentaTotal || 0) +
        (totalsByZone[zone].zonacostosIndirectosTotal || 0);
      totalsByZone[zone].zonautilidadBruta =
        (totalsByZone[zone].zonaingresosOperacionalesTotal || 0) -
        (totalsByZone[zone].zonacostosDeVentaTotal || 0) -
        (totalsByZone[zone].zonacostosIndirectosTotal || 0);
      totalsByZone[zone].zonautilidadPerdidaOperacional =
        totalsByZone[zone].zonautilidadBruta -
        (totalsByZone[zone].zonagastosOperacionalesAdministrativosTotal || 0) -
        (totalsByZone[zone].zonagastosOperacionalesComercialesTotal || 0);
      totalsByZone[zone].zonautilidadAntesDeImpuesto =
        totalsByZone[zone].zonautilidadPerdidaOperacional +
        (totalsByZone[zone].zonaingresosNoOperacionalesTotal || 0) -
        (totalsByZone[zone].zonagastosNoOperacionalesTotal || 0);
    });
    return totalsByZone;
  };

  // Uso de useMemo para renderizar solo cuando cambian los datos o rubros
  const renderData = useMemo(() => {
    return Object.entries(data).map(([year, uens]) => {
      const actualizedYearData = dataActual[year] || {};
      const percentages = yearPercentages[year] || {};

      // Proyectado: "Unidades de Apoyo"
      const apoyoTotalZonas = uens?.["Unidades de Apoyo"]?.zones || {};
      const nacionalTotalsFinal = apoyoTotalZonas.Nacional || {};
      const exceptonacionalZoneTotalsFinal = Object.fromEntries(
        Object.entries(apoyoTotalZonas).filter(([zone]) => zone !== "Nacional")
      );
      const nacionalShareConstructoraFinal = calculateShareFinal(nacionalTotalsFinal, percentages.nacionalConstructora);
      const nacionalSharePromotoraFinal = calculateShareFinal(nacionalTotalsFinal, percentages.nacionalPromotora);
      const nacionalShareInmobiliariaFinal = calculateShareFinal(nacionalTotalsFinal, percentages.nacionalInmobiliaria);
      const otherZonesShareConstructoraFinal = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotoraFinal = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliariaFinal = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalInmobiliaria);

      const apoyoTotalsByZone = calculateTotalsByZoneProyectado(uens?.["Unidades de Apoyo"]?.zones || {});
      const nacionalTotals = apoyoTotalsByZone.Nacional || {};
      const exceptonacionalZoneTotals = Object.fromEntries(
        Object.entries(apoyoTotalsByZone).filter(([zone]) => zone !== "Nacional")
      );
      const nacionalShareConstructora = calculateShare(nacionalTotals, percentages.nacionalConstructora);
      const nacionalSharePromotora = calculateShare(nacionalTotals, percentages.nacionalPromotora);
      const nacionalShareInmobiliaria = calculateShare(nacionalTotals, percentages.nacionalInmobiliaria);
      const otherZonesShareConstructora = calculateShareExceptoNacional(exceptonacionalZoneTotals, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotora = calculateShareExceptoNacional(exceptonacionalZoneTotals, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliaria = calculateShareExceptoNacional(exceptonacionalZoneTotals, percentages.diferenteNacionalInmobiliaria);

      // Actualizado: "Unidades de Apoyo"
      const apoyoTotalZonasActualizado = dataActual?.[year]?.["Unidades de Apoyo"]?.zones || {};
      const nacionalTotalsFinalActualizado = apoyoTotalZonasActualizado.Nacional || {};
      const exceptonacionalZoneTotalsFinalActualizado = Object.fromEntries(
        Object.entries(apoyoTotalZonasActualizado).filter(([zone]) => zone !== "Nacional")
      );
      const nacionalShareConstructoraFinalActualizado = calculateShareFinal(nacionalTotalsFinalActualizado, percentages.nacionalConstructora);
      const nacionalSharePromotoraFinalActualizado = calculateShareFinal(nacionalTotalsFinalActualizado, percentages.nacionalPromotora);
      const nacionalShareInmobiliariaFinalActualizado = calculateShareFinal(nacionalTotalsFinalActualizado, percentages.nacionalInmobiliaria);
      const otherZonesShareConstructoraFinalActualizado = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinalActualizado, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotoraFinalActualizado = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinalActualizado, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliariaFinalActualizado = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinalActualizado, percentages.diferenteNacionalInmobiliaria);

      const apoyoTotalsByZoneActualizado = calculateTotalsByZoneActualizado(uens?.["Unidades de Apoyo"]?.zones || {});
      const nacionalTotalsActualizado = apoyoTotalsByZoneActualizado.Nacional || {};
      const exceptonacionalZoneTotalsActualizado = Object.fromEntries(
        Object.entries(apoyoTotalsByZoneActualizado).filter(([zone]) => zone !== "Nacional")
      );
      const nacionalShareConstructoraActualizado = calculateShare(nacionalTotalsActualizado, percentages.nacionalConstructora);
      const nacionalSharePromotoraActualizado = calculateShare(nacionalTotalsActualizado, percentages.nacionalPromotora);
      const nacionalShareInmobiliariaActualizado = calculateShare(nacionalTotalsActualizado, percentages.nacionalInmobiliaria);
      const otherZonesShareConstructoraActualizado = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizado, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotoraActualizado = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizado, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliariaActualizado = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizado, percentages.diferenteNacionalInmobiliaria);

      return (
        <Accordion sx={{ marginBottom: "20px", width: "200%" }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}aria-controls={`panel-${year}-content`}id={`panel-${year}-header`}sx={{ background: "#a6a2a2" }}>
            <Typography sx={{ color: "white" }}>
              INFORME INICIAL VS EJECUTADO DE RESULTADOS {year}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div style={{display: "flex",flexWrap: "wrap",overflow: "auto",width: "100%",}}>
                {Object.entries(uens).map(([uen, { total: uenTotal, zones }]) => {
                  const actualizedZones = actualizedYearData[uen]?.zones || {};

                  // Proyectado
                  const totalsByZone  = calculateTotalsByZoneProyectado(zones);
                  const exceptonacionalZoneTotalsProyectado = Object.fromEntries(
                    Object.entries(totalsByZone).filter(([zone]) => zone !== "Nacional")
                  );
                  const nacionalZoneTotalsProyectado = totalsByZone.Nacional || {};

                  if (uen === "Constructora") {
                    Object.keys(nacionalZoneTotalsProyectado).forEach((key) => {
                      if (key in nacionalShareConstructora) {
                        nacionalZoneTotalsProyectado[key] += nacionalShareConstructora[key];
                      }
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(nacionalZoneTotalsProyectado).forEach((key) => {
                      if (key in nacionalSharePromotora) {
                        nacionalZoneTotalsProyectado[key] += nacionalSharePromotora[key];
                      }
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(nacionalZoneTotalsProyectado).forEach((key) => {
                      if (key in nacionalShareInmobiliaria) {
                        nacionalZoneTotalsProyectado[key] += nacionalShareInmobiliaria[key];
                      }
                    });
                  }

                  if (uen === "Constructora") {
                    Object.keys(exceptonacionalZoneTotalsProyectado).forEach((zone) => {
                      if (otherZonesShareConstructora[zone]) {
                        Object.keys(exceptonacionalZoneTotalsProyectado[zone]).forEach((key) => {
                          exceptonacionalZoneTotalsProyectado[zone][key] += otherZonesShareConstructora[zone][key] || 0;
                        });
                      }
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(exceptonacionalZoneTotalsProyectado).forEach((zone) => {
                      if (otherZonesSharePromotora[zone]) {
                        Object.keys(exceptonacionalZoneTotalsProyectado[zone]).forEach((key) => {
                          exceptonacionalZoneTotalsProyectado[zone][key] += otherZonesSharePromotora[zone][key] || 0;
                        });
                      }
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(exceptonacionalZoneTotalsProyectado).forEach((zone) => {
                      if (otherZonesShareInmobiliaria[zone]) {
                        Object.keys(exceptonacionalZoneTotalsProyectado[zone]).forEach((key) => {
                          exceptonacionalZoneTotalsProyectado[zone][key] += otherZonesShareInmobiliaria[zone][key] || 0;
                        });
                      }
                    });
                  }
                  // Ajustar totales para UEN (proyectado)
                  let adjustedTotal = uenTotal;
                  if (uen === "Constructora") {
                    adjustedTotal += nacionalShareConstructoraFinal.total || 0;
                  } else if (uen === "Promotora") {
                    adjustedTotal += nacionalSharePromotoraFinal.total || 0;
                  } else if (uen === "Inmobiliaria") {
                    adjustedTotal += nacionalShareInmobiliariaFinal.total || 0;
                  }
                  if (uen === "Constructora") {
                    Object.keys(zones).forEach((zone) => {
                      if (zone !== "Nacional" && otherZonesShareConstructoraFinal[zone]) {
                        adjustedTotal += otherZonesShareConstructoraFinal[zone].total || 0;
                      }
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(zones).forEach((zone) => {
                      if (zone !== "Nacional" && otherZonesSharePromotoraFinal[zone]) {
                        adjustedTotal += otherZonesSharePromotoraFinal[zone].total || 0;
                      }
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(zones).forEach((zone) => {
                      if (zone !== "Nacional" && otherZonesShareInmobiliariaFinal[zone]) {
                        adjustedTotal += otherZonesShareInmobiliariaFinal[zone].total || 0;
                      }
                    });
                  }

                  const uenTotals = calculateTotalsProyectado(zones);
                  let proyectadoTotals = { ...uenTotals };
                  if (uen === "Constructora") {
                    Object.keys(proyectadoTotals).forEach((key) => {
                      proyectadoTotals[key] += sumZonesForUEN(otherZonesShareConstructora)[key] || 0;
                      proyectadoTotals[key] += nacionalShareConstructora[key] || 0;
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(proyectadoTotals).forEach((key) => {
                      proyectadoTotals[key] += sumZonesForUEN(otherZonesSharePromotora)[key] || 0;
                      proyectadoTotals[key] += nacionalSharePromotora[key] || 0;
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(proyectadoTotals).forEach((key) => {
                      proyectadoTotals[key] += sumZonesForUEN(otherZonesShareInmobiliaria)[key] || 0;
                      proyectadoTotals[key] += nacionalShareInmobiliaria[key] || 0;
                    });
                  }

                  // Actualizado
                  const TotalsByZoneActualizado = calculateTotalsByZoneActualizado(actualizedZones);
                  const exceptonacionalZoneTotalsActualizado = Object.fromEntries(
                    Object.entries(TotalsByZoneActualizado).filter(([zone]) => zone !== "Nacional")
                  );
                  const nacionalZoneTotalsActualizado = TotalsByZoneActualizado.Nacional || {};

                  if (uen === "Constructora") {
                    Object.keys(nacionalZoneTotalsActualizado).forEach((key) => {
                      if (key in nacionalShareConstructoraActualizado) {
                        nacionalZoneTotalsActualizado[key] += nacionalShareConstructoraActualizado[key];
                      }
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(nacionalZoneTotalsActualizado).forEach((key) => {
                      if (key in nacionalSharePromotoraActualizado) {
                        nacionalZoneTotalsActualizado[key] += nacionalSharePromotoraActualizado[key];
                      }
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(nacionalZoneTotalsActualizado).forEach((key) => {
                      if (key in nacionalShareInmobiliariaActualizado) {
                        nacionalZoneTotalsActualizado[key] += nacionalShareInmobiliariaActualizado[key];
                      }
                    });
                  }

                  if (uen === "Constructora") {
                    Object.keys(exceptonacionalZoneTotalsActualizado).forEach((zone) => {
                      if (otherZonesShareConstructoraActualizado[zone]) {
                        Object.keys(exceptonacionalZoneTotalsActualizado[zone]).forEach((key) => {
                          exceptonacionalZoneTotalsActualizado[zone][key] += otherZonesShareConstructoraActualizado[zone][key] || 0;
                        });
                      }
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(exceptonacionalZoneTotalsActualizado).forEach((zone) => {
                      if (otherZonesSharePromotoraActualizado[zone]) {
                        Object.keys(exceptonacionalZoneTotalsActualizado[zone]).forEach((key) => {
                          exceptonacionalZoneTotalsActualizado[zone][key] += otherZonesSharePromotoraActualizado[zone][key] || 0;
                        });
                      }
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(exceptonacionalZoneTotalsActualizado).forEach((zone) => {
                      if (otherZonesShareInmobiliariaActualizado[zone]) {
                        Object.keys(exceptonacionalZoneTotalsActualizado[zone]).forEach((key) => {
                          exceptonacionalZoneTotalsActualizado[zone][key] += otherZonesShareInmobiliariaActualizado[zone][key] || 0;
                        });
                      }
                    });
                  }
                  // Ajustar totales para UEN (Actualizado)
                  let adjustedTotalActualizado = actualizedYearData[uen]?.total || 0;
                  if (uen === "Constructora") {
                    adjustedTotalActualizado += nacionalShareConstructoraFinalActualizado.total || 0;
                  } else if (uen === "Promotora") {
                    adjustedTotalActualizado += nacionalSharePromotoraFinalActualizado.total || 0;
                  } else if (uen === "Inmobiliaria") {
                    adjustedTotalActualizado += nacionalShareInmobiliariaFinalActualizado.total || 0;
                  }
                  if (uen === "Constructora") {
                    Object.keys(zones).forEach((zone) => {
                      if (zone !== "Nacional" && otherZonesShareConstructoraFinalActualizado[zone]) {
                        adjustedTotalActualizado += otherZonesShareConstructoraFinalActualizado[zone].total || 0;
                      }
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(zones).forEach((zone) => {
                      if (zone !== "Nacional" && otherZonesSharePromotoraFinalActualizado[zone]) {
                        adjustedTotalActualizado += otherZonesSharePromotoraFinalActualizado[zone].total || 0;
                      }
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(zones).forEach((zone) => {
                      if (zone !== "Nacional" && otherZonesShareInmobiliariaFinalActualizado[zone]) {
                        adjustedTotalActualizado += otherZonesShareInmobiliariaFinalActualizado[zone].total || 0;
                      }
                    });
                  }

                  const uenTotalsActualizado = calculateTotalsActualizado(actualizedZones);
                  let actualizadoTotals = { ...uenTotalsActualizado };
                  if (uen === "Constructora") {
                    Object.keys(actualizadoTotals).forEach((key) => {
                      actualizadoTotals[key] += sumZonesForUEN(otherZonesShareConstructoraActualizado)[key] || 0;
                      actualizadoTotals[key] += nacionalShareConstructoraActualizado[key] || 0;
                    });
                  } else if (uen === "Promotora") {
                    Object.keys(actualizadoTotals).forEach((key) => {
                      actualizadoTotals[key] += sumZonesForUEN(otherZonesSharePromotoraActualizado)[key] || 0;
                      actualizadoTotals[key] += nacionalSharePromotoraActualizado[key] || 0;
                    });
                  } else if (uen === "Inmobiliaria") {
                    Object.keys(actualizadoTotals).forEach((key) => {
                      actualizadoTotals[key] += sumZonesForUEN(otherZonesShareInmobiliariaActualizado)[key] || 0;
                      actualizadoTotals[key] += nacionalShareInmobiliariaActualizado[key] || 0;
                    });
                  }

                  return (
                    <div style={{ flex: "1 1 20%", margin: "0.2px" }}>
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
                      <h4 style={uen == "Constructora"? informeStyles.uenConstructora: uen == "Inmobiliaria"? informeStyles.uenInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.uenUA: informeStyles.uen}>
                        <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                          {uen}:
                        </Typography>
                        <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                          {adjustedTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                        </Typography>
                        <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                          {(adjustedTotalActualizado || 0).toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                        </Typography>
                        <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                          {(adjustedTotal - (adjustedTotalActualizado || 0)).toLocaleString('es-ES')}
                        </Typography>
                      </h4>
                        <div style={uen == "Constructora"? informeStyles.containerConstructora: uen == "Inmobiliaria"? informeStyles.containerInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.containerUA: informeStyles.container}>
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
                              {(proyectadoTotals.ingresosOperacionalesTotal  - actualizadoTotals.ingresosOperacionalesTotalActualizado || 0).toLocaleString('es-ES')}
                            </Typography>
                          </div>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption"style={{ width: "25%" }}>
                              Costos de Venta:
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                              {proyectadoTotals.costosDeVentacostosIndirectosTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                              {actualizadoTotals.costosDeVentacostosIndirectosTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"style={{ width: "25%" }}>
                              {(proyectadoTotals.costosDeVentacostosIndirectosTotal - actualizadoTotals.costosDeVentacostosIndirectosTotalActualizado).toLocaleString('es-ES')}
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
                              {(proyectadoTotals.gastosOperacionalesAdministrativosTotal - actualizadoTotals.gastosOperacionalesAdministrativosTotalActualizado || 0).toLocaleString('es-ES')}
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
                        {Object.entries(zones).map(([zone, { total: zoneTotal, rubros }]) => (
                          <div>
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
                                  {(zoneTotal - (actualizedZones[zone]?.total || 0)).toLocaleString('es-ES', {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                </Typography>
                              </div>
                            </h5>
                            <div style={uen == "Constructora"? informeStyles.containerConstructora: uen == "Inmobiliaria"? informeStyles.containerInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.containerUA: informeStyles.container}>
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
                                  {(totalsByZone[zone].zonaingresosOperacionalesTotal - (TotalsByZoneActualizado[zone]?.zonaingresosOperacionalesTotalActualizado || 0)).toLocaleString('es-ES')}
                                </Typography>
                              </div>
                              <div style={informeStyles.textContent}>
                                <Typography variant="caption"style={{ width: "25%" }}>
                                  Costos de Venta:
                                </Typography>
                                <Typography variant="caption"style={{ width: "25%" }}>
                                  {totalsByZone[zone].zonacostosDeVentacostosIndirectosTotal.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                </Typography>
                                <Typography variant="caption"style={{ width: "25%" }}>
                                  {TotalsByZoneActualizado[zone]?.zonacostosDeVentacostosIndirectosTotalActualizado.toLocaleString("es-ES",{minimumFractionDigits: 0,maximumFractionDigits: 0,}) || 0}
                                </Typography>
                                <Typography variant="caption"style={{ width: "25%" }}>
                                  {(totalsByZone[zone].zonacostosDeVentacostosIndirectosTotal - (TotalsByZoneActualizado[zone]?.zonacostosDeVentacostosIndirectosTotalActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonautilidadBruta - (TotalsByZoneActualizado[zone]?.zonautilidadBrutaActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonagastosOperacionalesAdministrativosTotal - (TotalsByZoneActualizado[zone]?.zonagastosOperacionalesAdministrativosTotalActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonagastosOperacionalesComercialesTotal - (TotalsByZoneActualizado[zone]?.zonagastosOperacionalesComercialesTotalActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonautilidadPerdidaOperacional - (TotalsByZoneActualizado[zone]?.zonautilidadPerdidaOperacionalActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonaingresosNoOperacionalesTotal - (TotalsByZoneActualizado[zone]?.zonaingresosNoOperacionalesTotalActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonagastosNoOperacionalesTotal - (TotalsByZoneActualizado[zone]?.zonagastosNoOperacionalesTotalActualizado || 0)).toLocaleString("es-ES")}
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
                                  {(totalsByZone[zone].zonautilidadAntesDeImpuesto - (TotalsByZoneActualizado[zone]?.zonautilidadAntesDeImpuestoActualizado || 0)).toLocaleString("es-ES")}
                                </Typography>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  );
                })}
              </div>
          </AccordionDetails>
        </Accordion>
      );
    });
  }, [data, dataActual, updatedRubros, updatedRubrosActualizado]);

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <Sidebar />
      <div style={{ display: "flex", width: "100%", flexDirection: "column" }}>
        <div style={{ padding: "1rem" }}>
          <Typography variant="subtitle1">Filtrar por meses:</Typography>
          <FormGroup row>
            {monthNames.map((name, index) => (
              <FormControlLabel
                key={index}
                control={
                  <Checkbox
                    checked={selectedMonths.includes(index)}
                    onChange={() => handleMonthToggle(index)}
                  />
                }
                label={name}
              />
            ))}
          </FormGroup>
          <Button
            variant="contained"
            onClick={fetchData}
            sx={{ marginTop: "0.5rem" }}
          >
            Aplicar Filtro
          </Button>
        </div>

        {loading ? <p><LoadingModal open={loading} /></p> : renderData}
      </div>
    </div>
  );
};

export default EjecutadoConsolidado;