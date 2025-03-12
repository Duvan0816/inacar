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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const csrftoken = getCookie("csrftoken");

const EjecutadoConsolidado = () => {
  const [data, setData] = useState([]); // For the first dataset
  const [dataActual, setDataActual] = useState([]); // For the second dataset
  const [updatedRubros, setUpdatedRubros] = useState([]);
  const [updatedRubrosActualizado, setUpdatedRubrosActualizado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRubrosData = async () => {
    const token = localStorage.getItem("token");
    const rubrosResponse = await fetch(`${API_URL}/rubros/`, {
      method: "GET",
      headers: {
        "X-CSRFToken": csrftoken,
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!rubrosResponse.ok) throw new Error(`HTTP error! Status: ${rubrosResponse.status}`);
    return await rubrosResponse.json();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const csrftoken = getCookie("csrftoken");
      const token = localStorage.getItem("token");
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
      const fetchDataset = async (endpoint) => {
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
  
      // Fetch both datasets
      const [proyectadoData, actualizadoData] = await Promise.all([
        fetchDataset("InformeDetalladoPresupuesto"),
        fetchDataset("InformePresupuestoEjecutado"),
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

  const calculateTotalsProyectado = (zones, updatedRubros) => {
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
  
  const calculateTotalsActualizado = (zones, updatedRubrosActualizado) => {
  
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
  
  
  const calculateTotalsByZoneActualizado = (zones, updatedRubrosActualizado) => {
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

  const renderData = (proyectadoData, actualizadoData) => {
    return Object.entries(proyectadoData).map(([year, uens]) => {
      const actualizedYearData = actualizadoData[year] || {};

      // Obtener porcentajes para el año actual
      const percentages = yearPercentages[year] || {};

      // Calculate the total for "Unidades de Apoyo" to split among other UENs
      const apoyoTotalZonas = uens["Unidades de Apoyo"]?.zones || {};
      const nacionalTotalsFinal = apoyoTotalZonas.Nacional || {};
      const exceptonacionalZoneTotalsFinal = Object.fromEntries(
        Object.entries(apoyoTotalZonas).filter(([zones]) => zones !== "Nacional")
      );

      // Distribuir los totales de "Nacional"
      const nacionalShareConstructoraFinal = calculateShareFinal(nacionalTotalsFinal, percentages.nacionalConstructora);
      const nacionalSharePromotoraFinal = calculateShareFinal(nacionalTotalsFinal, percentages.nacionalPromotora);
      const nacionalShareInmobiliariaFinal = calculateShareFinal(nacionalTotalsFinal, percentages.nacionalInmobiliaria);
      // Distribuir los totales de las demás zonas
      const otherZonesShareConstructoraFinal = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotoraFinal = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliariaFinal = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinal, percentages.diferenteNacionalInmobiliaria);

      // Calcular los totales por zona de "Unidades de Apoyo"
      const apoyoTotalsByZone = calculateTotalsByZoneProyectado(uens["Unidades de Apoyo"]?.zones || {});
      const nacionalTotals = apoyoTotalsByZone.Nacional || {};
      const exceptonacionalZoneTotals = Object.fromEntries(
        Object.entries(apoyoTotalsByZone).filter(([zones]) => zones !== "Nacional")
      );
      // Distribuir los totales de "Nacional"
      const nacionalShareConstructora = calculateShare(nacionalTotals, percentages.nacionalConstructora);
      const nacionalSharePromotora = calculateShare(nacionalTotals, percentages.nacionalPromotora);
      const nacionalShareInmobiliaria = calculateShare(nacionalTotals, percentages.nacionalInmobiliaria);
      // Distribuir los totales de las demás zonas
      const otherZonesShareConstructora = calculateShareExceptoNacional(exceptonacionalZoneTotals, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotora = calculateShareExceptoNacional(exceptonacionalZoneTotals, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliaria = calculateShareExceptoNacional(exceptonacionalZoneTotals, percentages.diferenteNacionalInmobiliaria);

      // Obtener "Unidades de Apoyo" de actualizadoData (si existe ese año)
      const apoyoTotalZonasActualizado = actualizadoData?.[year]?.["Unidades de Apoyo"]?.zones || {};
      const nacionalTotalsFinalActualizado = apoyoTotalZonasActualizado.Nacional || {};
      const exceptonacionalZoneTotalsFinalActualizado = Object.fromEntries(
        Object.entries(apoyoTotalZonasActualizado).filter(([zone]) => zone !== "Nacional")
      );

      // Distribuir los totales de "Nacional"
      const nacionalShareConstructoraFinalActualizado = calculateShareFinal(nacionalTotalsFinalActualizado, percentages.nacionalConstructora);
      const nacionalSharePromotoraFinalActualizado = calculateShareFinal(nacionalTotalsFinalActualizado, percentages.nacionalPromotora);
      const nacionalShareInmobiliariaFinalActualizado = calculateShareFinal(nacionalTotalsFinalActualizado, percentages.nacionalInmobiliaria);
      // Distribuir los totales de las demás zonas
      const otherZonesShareConstructoraFinalActualizado = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinalActualizado, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotoraFinalActualizado = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinalActualizado, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliariaFinalActualizado = calculateShareExceptoNacionalFinal(exceptonacionalZoneTotalsFinalActualizado, percentages.diferenteNacionalInmobiliaria);
      
      // Calcular los totales por zona de "Unidades de Apoyo"
      const apoyoTotalsByZoneActualizado = calculateTotalsByZoneActualizado(uens["Unidades de Apoyo"]?.zones || {});
      const nacionalTotalsActualizado = apoyoTotalsByZoneActualizado.Nacional || {};
      const exceptonacionalZoneTotalsActualizado = Object.fromEntries(
        Object.entries(apoyoTotalsByZoneActualizado).filter(([zones]) => zones !== "Nacional")
      );
      // Distribuir los totales de "Nacional"
      const nacionalShareConstructoraActualizado = calculateShare(nacionalTotalsActualizado, percentages.nacionalConstructora);
      const nacionalSharePromotoraActualizado = calculateShare(nacionalTotalsActualizado, percentages.nacionalPromotora);
      const nacionalShareInmobiliariaActualizado = calculateShare(nacionalTotalsActualizado, percentages.nacionalInmobiliaria);
      // Distribuir los totales de las demás zonas
      const otherZonesShareConstructoraActualizado = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizado, percentages.diferenteNacionalConstructora);
      const otherZonesSharePromotoraActualizado = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizado, percentages.diferenteNacionalPromotora);
      const otherZonesShareInmobiliariaActualizado = calculateShareExceptoNacional(exceptonacionalZoneTotalsActualizado, percentages.diferenteNacionalInmobiliaria);

      function calculateShareExceptoNacional(totals, percentage) {
        return Object.keys(totals).reduce((acc, zone) => {
          acc[zone] = Object.fromEntries(
            Object.entries(totals[zone]).map(([key, value]) => [key, value * percentage || 0])
          );
          return acc;
        }, {});
      }

      function calculateShareExceptoNacionalFinal(totals, percentage) {
        return Object.entries(totals).reduce((acc, [zone, data]) => {
          acc[zone] = { total: data.total * percentage || 0 };
          return acc;
        }, {});
      }

      function calculateShare(totals, percentage) {
        return Object.keys(totals).reduce((acc, key) => {
          acc[key] = key === "total" ? totals[key] * percentage || 0 : totals[key];
          return acc;
        }, {});
      }

      function calculateShare(totals, percentage) {
        return Object.keys(totals).reduce((acc, key) => {
          acc[key] = totals[key] * percentage || 0;
          return acc;
        }, {});
      }
      
      function calculateShareFinal(totals, percentage) {
        return Object.keys(totals).reduce((acc, key) => {
          acc[key] = totals[key] * percentage || 0;
          return {
            total: (totals.total || 0) * percentage,
          };
        }, {});
      }

      function sumZonesForUEN(zoneShare) {
        const uenTotal = {};
        Object.keys(zoneShare).forEach((zone) => {
          Object.entries(zoneShare[zone]).forEach(([key, value]) => {
            if (!uenTotal[key]) {
              uenTotal[key] = 0;
            }
            uenTotal[key] += value;
          });
        });
        return uenTotal;
      }

      const sumConstructora = sumZonesForUEN(otherZonesShareConstructora);
      const sumPromotora = sumZonesForUEN(otherZonesSharePromotora);
      const sumInmobiliaria = sumZonesForUEN(otherZonesShareInmobiliaria);
      const sumConstructoraActualizado = sumZonesForUEN(otherZonesShareConstructoraActualizado);
      const sumPromotoraActualizado = sumZonesForUEN(otherZonesSharePromotoraActualizado);
      const sumInmobiliariaActualizado = sumZonesForUEN(otherZonesShareInmobiliariaActualizado);

      return (
        <div key={year}>
          <Accordion key={year} sx={{ marginBottom: "20px", width: "200%" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}aria-controls={`panel-${year}-content`}id={`panel-${year}-header`}sx={{ background: "#a6a2a2" }}>
              <Typography sx={{ color: "white" }}>
                INFORME INICIAL VS EJECUTADO DE RESULTADOS {year}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{display: "flex",flexWrap: "wrap",overflow: "auto",width: "100%",}}>
                  {Object.entries(uens).map(([uen, { total: uenTotal, zones }]) => {
                    const actualizedZones = actualizedYearData[uen]?.zones || {};
                    
                    const totalsByZone = calculateTotalsByZoneProyectado(zones, updatedRubros);
                    const exceptonacionalZoneTotals = Object.fromEntries(
                      Object.entries(totalsByZone).filter(([zone]) => zone !== "Nacional")
                    );
                    const nacionalZoneTotals = totalsByZone.Nacional || {};

                    if (uen === "Constructora") {
                      Object.keys(nacionalZoneTotals).forEach((key) => {
                        if (key in nacionalShareConstructora) {
                          nacionalZoneTotals[key] += nacionalShareConstructora[key];
                        }
                      });
                    } else if (uen === "Promotora") {
                      Object.keys(nacionalZoneTotals).forEach((key) => {
                        if (key in nacionalSharePromotora) {
                          nacionalZoneTotals[key] += nacionalSharePromotora[key];
                        }
                      });
                    } else if (uen === "Inmobiliaria") {
                      Object.keys(nacionalZoneTotals).forEach((key) => {
                        if (key in nacionalShareInmobiliaria) {
                          nacionalZoneTotals[key] += nacionalShareInmobiliaria[key];
                        }
                      });
                    }

                    if (uen === "Constructora") {
                      Object.keys(exceptonacionalZoneTotals).forEach((zone) => {
                        if (otherZonesShareConstructora[zone]) {
                          Object.keys(exceptonacionalZoneTotals[zone]).forEach((key) => {
                            exceptonacionalZoneTotals[zone][key] += otherZonesShareConstructora[zone][key] || 0;
                          });
                        }
                      });
                    } else if (uen === "Promotora") {
                      Object.keys(exceptonacionalZoneTotals).forEach((zone) => {
                        if (otherZonesSharePromotora[zone]) {
                          Object.keys(exceptonacionalZoneTotals[zone]).forEach((key) => {
                            exceptonacionalZoneTotals[zone][key] += otherZonesSharePromotora[zone][key] || 0;
                          });
                        }
                      });
                    } else if (uen === "Inmobiliaria") {
                      Object.keys(exceptonacionalZoneTotals).forEach((zone) => {
                        if (otherZonesShareInmobiliaria[zone]) {
                          Object.keys(exceptonacionalZoneTotals[zone]).forEach((key) => {
                            exceptonacionalZoneTotals[zone][key] += otherZonesShareInmobiliaria[zone][key] || 0;
                          });
                        }
                      });
                    }
                    
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
                        proyectadoTotals[key] += sumConstructora[key] || 0;
                        proyectadoTotals[key] += nacionalShareConstructora[key] || 0;
                      });
                    } else if (uen === "Promotora") {
                      Object.keys(proyectadoTotals).forEach((key) => {
                        proyectadoTotals[key] += sumPromotora[key] || 0;
                        proyectadoTotals[key] += nacionalSharePromotora[key] || 0;
                      });
                    } else if (uen === "Inmobiliaria") {
                      Object.keys(proyectadoTotals).forEach((key) => {
                        proyectadoTotals[key] += sumInmobiliaria[key] || 0;
                        proyectadoTotals[key] += nacionalShareInmobiliaria[key] || 0;
                      });
                    }

                    const TotalsByZoneActualizado = calculateTotalsByZoneActualizado(actualizedZones, updatedRubrosActualizado);
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
            
                    let adjustedTotalActualizado = actualizedYearData[uen]?.total;

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
                        actualizadoTotals[key] += sumConstructoraActualizado[key] || 0;
                        actualizadoTotals[key] += nacionalShareConstructoraActualizado[key] || 0;
                      });
                    } else if (uen === "Promotora") {
                      Object.keys(actualizadoTotals).forEach((key) => {
                        actualizadoTotals[key] += sumPromotoraActualizado[key] || 0;
                        actualizadoTotals[key] += nacionalSharePromotoraActualizado[key] || 0;
                      });
                    } else if (uen === "Inmobiliaria") {
                      Object.keys(actualizadoTotals).forEach((key) => {
                        actualizadoTotals[key] += sumInmobiliariaActualizado[key] || 0;
                        actualizadoTotals[key] += nacionalShareInmobiliariaActualizado[key] || 0;
                      });
                    }

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
                              {adjustedTotal.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                              {(adjustedTotalActualizado || 0).toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                            </Typography>
                            <Typography variant="caption"sx={{ color: "white", width: "25%" }}>
                              {(adjustedTotal - (adjustedTotalActualizado || 0)).toLocaleString('es-ES')}
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
                                {(proyectadoTotals.ingresosOperacionalesTotal  - actualizadoTotals.ingresosOperacionalesTotalActualizado || 0).toLocaleString('es-ES')}
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
                                      {(totalsByZone[zone].zonaingresosOperacionalesTotal - (TotalsByZoneActualizado[zone]?.zonaingresosOperacionalesTotalActualizado || 0)).toLocaleString('es-ES')}
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
                                      {(totalsByZone[zone].zonacostosIndirectosTotal - (TotalsByZoneActualizado[zone]?.zonacostosIndirectosTotalActualizado || 0)).toLocaleString("es-ES")}
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
                                      {(totalsByZone[zone].zonacostosDeVentaTotal - (TotalsByZoneActualizado[zone]?.zonacostosDeVentaTotalActualizado || 0)).toLocaleString("es-ES")}
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