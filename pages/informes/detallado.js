import React, { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import { getCookie } from "../../src/utils/cookieUtils";
import {Accordion,AccordionDetails,AccordionSummary,Typography,FormGroup,FormControlLabel,Checkbox,} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoadingModal from "@/components/loading";
import informeStyles from "../../src/styles/informe.js";
import * as XLSX from "xlsx";
import { Button } from "@mui/material";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const csrftoken = getCookie("csrftoken");

const Detallado = () => {
  const [data, setData] = useState([]);
  const [updatedRubros, setUpdatedRubros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTotalVisible, setIsTotalVisible] = useState(false);
  const [isUtilidadVisible, setIsUtilidadVisible] = useState(false);
  const [isRubroVisible, setIsRubroVisible] = useState(false);
  const [isSubrubroVisible, setIsSubrubroVisible] = useState(false);
  const [isAuxiliarVisible, setIsAuxiliarVisible] = useState(false);
  const [isCuentaVisible, setIsCuentaVisible] = useState(false);
  const [applyPercentage, setApplyPercentage] = useState(false);

  const handleTotalToggle = () => {
    setIsTotalVisible(!isTotalVisible);
  };
  const handleUtilidadToggle = () => {
    setIsUtilidadVisible(!isUtilidadVisible);
  };
  const handleApplyPercentageToggle = (event) => {
    setApplyPercentage(event.target.checked);
  };
  
  const organizeData = (data) => {
    const organizedData = {};

    data.forEach((item) => {

      const year = new Date(item.fecha).getFullYear();
      const uen = item.uen;
      const zone = item.cuenta.regional;
      const rubroIndex = item.rubro;
      const subrubroIndex = item.subrubro;
      const auxiliarIndex = item.auxiliar;
      const cuentaCodigo = item.cuenta.codigo;
      const cuentaNombre = item.cuenta.nombre.trim();
      const presupuestoMeses = item.meses_presupuesto;

      // Sumar todos los valores de presupuestomes en meses_presupuesto
      const totalPresupuestoMes = item.meses_presupuesto.reduce((total, mes) => {
        return total + parseFloat(mes.presupuestomes);
      }, 0);
      
      // Initialize data structure
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
          auxiliares: {},
        };
      }
      if (!organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex]) {
        organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex] = {
          total: 0,
          cuentas: {},
        };
      }
  
      // Group by cuentaCodigo
      const cuentaAgrupada = organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex].cuentas;
      if (!cuentaAgrupada[cuentaCodigo]) {
        cuentaAgrupada[cuentaCodigo] = {
          nombre: cuentaNombre,
          total: 0,
          meses_presupuesto: Array(12).fill(0),
        };
      }
      cuentaAgrupada[cuentaCodigo].total += totalPresupuestoMes;

      presupuestoMeses.forEach(({ meses, presupuestomes }) => {
        if (meses >= 0 && meses < 12) {
          cuentaAgrupada[cuentaCodigo].meses_presupuesto[meses] += parseFloat(presupuestomes || 0);
        }
      });

      // Update subrubro and auxiliar totals regardless of exclusion
      organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex].auxiliares[auxiliarIndex].total += totalPresupuestoMes;
      organizedData[year][uen].zones[zone].rubros[rubroIndex].subrubros[subrubroIndex].total += totalPresupuestoMes;

      if (rubroIndex === 3 && subrubroIndex === 14) {

      } else {
        // Agregar a los totales de rubro, zona y UEN si no es "HONORARIOS INTERNOS"
        organizedData[year][uen].zones[zone].rubros[rubroIndex].total += totalPresupuestoMes;
        organizedData[year][uen].zones[zone].total += totalPresupuestoMes;
        organizedData[year][uen].total += totalPresupuestoMes;
      }
    });
    return organizedData;
  };

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
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let allData = [];
      let page = 1;
      let totalPages = 1;
      do {
        const presupuestosResponse = await fetch(
          `${API_URL}/InformeDetalladoPresupuesto/?page=${page}`,
          {
            method: "GET",
            headers: {
              "X-CSRFToken": csrftoken,
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );
  
        if (!presupuestosResponse.ok) {
          const errorText = await presupuestosResponse.text();
          console.error("Error Response Text:", errorText);
          throw new Error(`HTTP error! Status: ${presupuestosResponse.status}`);
        }
  
        const data = await presupuestosResponse.json();
        allData = [...allData, ...data.results];

        totalPages = Math.ceil(data.count / 3000); 
        page++;
      } while (page <= totalPages);

      const rubrosData = await fetchRubrosData();
      setUpdatedRubros(rubrosData);

      const organizedData = organizeData(allData);
      setData(organizedData);
    } catch (error) {
      console.error("Fetch error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateTotals = (zones) => {
    let ingresosOperacionalesTotal = 0;
    let costosIndirectosTotal = 0;
    let costosDeVentaTotal = 0;
    let gastosOperacionalesAdministrativosTotal = 0;
    let gastosOperacionalesComercialesTotal = 0;
    let ingresosNoOperacionalesTotal = 0;
    let gastosNoOperacionalesTotal = 0;
  
    // Iterar por zonas y rubros para calcular los totales
    Object.values(zones).forEach(({ rubros }) => {
      if (rubros) {
        Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
          const rubroName = updatedRubros[rubroIndex]?.nombre;
  
          // Validar que rubroData.total sea un número antes de sumarlo
          const total = rubroData?.total || 0;
  
          if (rubroName === "INGRESOS OPERACIONALES") {
            ingresosOperacionalesTotal += total;
          } else if (rubroName === "COSTOS INDIRECTOS") {
            costosIndirectosTotal += total;
          } else if (rubroName === "COSTOS DE VENTA") {
            costosDeVentaTotal += total;
          } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            gastosOperacionalesAdministrativosTotal += total;
          } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            gastosOperacionalesComercialesTotal += total;
          } else if (rubroName === "INGRESOS NO OPERACIONALES") {
            ingresosNoOperacionalesTotal += total;
          } else if (rubroName === "GASTOS NO OPERACIONALES") {
            gastosNoOperacionalesTotal += total;
          }
        });
      }
    });
  
    const costosDeVentacostosIndirectosTotal =
       costosDeVentaTotal + costosIndirectosTotal;
    const utilidadBruta =
      ingresosOperacionalesTotal - costosDeVentaTotal - costosIndirectosTotal;
    const utilidadoPerdidaOperacional =
      utilidadBruta - gastosOperacionalesAdministrativosTotal - gastosOperacionalesComercialesTotal;
    const utilidadAntesDeImpuesto =
      utilidadoPerdidaOperacional + ingresosNoOperacionalesTotal - gastosNoOperacionalesTotal;
  
    return {
      costosDeVentacostosIndirectosTotal,
      gastosNoOperacionalesTotal,
      ingresosNoOperacionalesTotal,
      utilidadAntesDeImpuesto,
      ingresosOperacionalesTotal,
      costosIndirectosTotal,
      costosDeVentaTotal,
      utilidadBruta,
      utilidadoPerdidaOperacional,
      gastosOperacionalesAdministrativosTotal,
      gastosOperacionalesComercialesTotal,
    };
  };
  
  const calculateTotalsByZone = (zones) => {
    const totalsByZone = {};
  
    // Iterar por zonas y rubros para calcular los totales por zona
    Object.entries(zones).forEach(([zoneName, { rubros }]) => {
      // Inicializar objeto de totales para la zona si no existe
      if (!totalsByZone[zoneName]) {
        totalsByZone[zoneName] = {
          ingresosOperacionalesTotal: 0,
          costosIndirectosTotal: 0,
          costosDeVentaTotal: 0,
          gastosOperacionalesAdministrativosTotal: 0,
          gastosOperacionalesComercialesTotal: 0,
          utilidadBruta: 0,
          utilidadoPerdidaOperacional: 0,
          ingresosNoOperacionalesTotal: 0,
          gastosNoOperacionalesTotal: 0,
        };
      }
  
      // Verificar si rubros está definido
      if (rubros) {
        Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
          const rubroName = updatedRubros[rubroIndex]?.nombre;
  
          // Validar que rubroData.total sea un número antes de sumarlo
          const total = rubroData?.total || 0;
  
          if (rubroName === "INGRESOS OPERACIONALES") {
            totalsByZone[zoneName].ingresosOperacionalesTotal += total;
          } else if (rubroName === "COSTOS INDIRECTOS") {
            totalsByZone[zoneName].costosIndirectosTotal += total;
          } else if (rubroName === "COSTOS DE VENTA") {
            totalsByZone[zoneName].costosDeVentaTotal += total;
          } else if (rubroName === "GASTOS OPERACIONALES DE ADMINISTRACION") {
            totalsByZone[zoneName].gastosOperacionalesAdministrativosTotal += total;
          } else if (rubroName === "GASTOS OPERACIONALES DE COMERCIALIZACION") {
            totalsByZone[zoneName].gastosOperacionalesComercialesTotal += total;
          } else if (rubroName === "INGRESOS NO OPERACIONALES") {
            totalsByZone[zoneName].ingresosNoOperacionalesTotal += total;
          } else if (rubroName === "GASTOS NO OPERACIONALES") {
            totalsByZone[zoneName].gastosNoOperacionalesTotal += total;
          }
        });
      }
  
      totalsByZone[zoneName].costosDeVentacostosIndirectosTotal =
        totalsByZone[zoneName].costosDeVentaTotal +
        totalsByZone[zoneName].costosIndirectosTotal;

      // Calcular utilidad bruta y operativa para la zona
      totalsByZone[zoneName].utilidadBruta =
        totalsByZone[zoneName].ingresosOperacionalesTotal -
        totalsByZone[zoneName].costosDeVentaTotal -
        totalsByZone[zoneName].costosIndirectosTotal;
  
      totalsByZone[zoneName].utilidadoPerdidaOperacional =
        totalsByZone[zoneName].utilidadBruta -
        totalsByZone[zoneName].gastosOperacionalesAdministrativosTotal -
        totalsByZone[zoneName].gastosOperacionalesComercialesTotal;
  
      totalsByZone[zoneName].utilidadAntesDeImpuesto =
        totalsByZone[zoneName].utilidadoPerdidaOperacional +
        totalsByZone[zoneName].ingresosNoOperacionalesTotal -
        totalsByZone[zoneName].gastosNoOperacionalesTotal;
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
  const renderData = (data) => {
    return Object.entries(data).map(([year, uens]) => {

      // Obtener porcentajes para el año actual
      const percentages = yearPercentages[year] || {};

      // Calculate the total for "Unidades de Apoyo" to split among other UENs
      const apoyoTotalZonas = uens["Unidades de Apoyo"]?.zones || 0;
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
      const apoyoTotalsByZone = calculateTotalsByZone(uens["Unidades de Apoyo"]?.zones || {});
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

      return (
          <div key={year}>
          <Accordion key={year} sx={{ marginBottom: "20px" }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: "white" }} />}
              aria-controls={`panel-${year}-content`}
              id={`panel-${year}-header`}
              sx={{ background: "#a6a2a2" }}
            >
              <Typography sx={{ color: "white" }}>
                INFORME DETALLADO DE RESULTADOS {year}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ display: "flex", flexWrap: "wrap", overflow: "auto" }}>
                {Object.entries(uens).map(([uen, { total: uenTotal, zones }]) => {
                  const totalsByZone = calculateTotalsByZone(zones, updatedRubros);
                  const exceptonacionalZoneTotals = Object.fromEntries(
                    Object.entries(totalsByZone).filter(([zone]) => zone !== "Nacional")
                  );
                  const nacionalZoneTotals = totalsByZone.Nacional || {};
      
                  if (applyPercentage) {
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
                  }
      
                  if (applyPercentage) {
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
                  }

                  let adjustedTotal = uenTotal;

                  // Aplicar porcentajes solo si el checkbox está marcado
                  if (applyPercentage) {
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
                  }
                  
                  const uenTotals = calculateTotals(zones);
                  let adjustedTotals = { ...uenTotals };
                  
                  // Aplicar porcentajes a adjustedTotals
                  if (applyPercentage) {
                    if (uen === "Constructora") {
                      Object.keys(adjustedTotals).forEach((key) => {
                        adjustedTotals[key] += sumConstructora[key] || 0;
                        adjustedTotals[key] += nacionalShareConstructora[key] || 0;
                      });
                    } else if (uen === "Promotora") {
                      Object.keys(adjustedTotals).forEach((key) => {
                        adjustedTotals[key] += sumPromotora[key] || 0;
                        adjustedTotals[key] += nacionalSharePromotora[key] || 0;
                      });
                    } else if (uen === "Inmobiliaria") {
                      Object.keys(adjustedTotals).forEach((key) => {
                        adjustedTotals[key] += sumInmobiliaria[key] || 0;
                        adjustedTotals[key] += nacionalShareInmobiliaria[key] || 0;
                      });
                    }
                  }

                  return (
                    <div key={uen} style={{ flex: "1 1 20%", margin: "0.2px" }}>
                      <h4>
                        <div style={uen == "Constructora"? informeStyles.uenConstructora: uen == "Inmobiliaria"? informeStyles.uenInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.uenUA: informeStyles.uen}>
                          <Typography sx={{ color: "white" }}>{uen}:</Typography>
                          {isTotalVisible && (
                            <Typography sx={{ color: "white" }}>
                              {adjustedTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          )}
                        </div>
                      </h4>
                      {isUtilidadVisible && (
                        <div style={uen == "Constructora"? informeStyles.containerConstructora: uen == "Inmobiliaria"? informeStyles.containerInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.containerUA: informeStyles.container}>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption">
                              Ingresos Operacionales:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.ingresosOperacionalesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption">
                              Costos de Venta:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.costosDeVentacostosIndirectosTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                            <Typography variant="caption">
                              Utilidad Bruta:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.utilidadBruta.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption">
                              Gastos de Administración:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.gastosOperacionalesAdministrativosTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption">
                              Gastos de Comercialización:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.gastosOperacionalesComercialesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                            <Typography variant="caption">
                              Utilidad ó (PERDIDA) Operacional:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.utilidadoPerdidaOperacional.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption">
                              Ingresos No Operacionales:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.ingresosNoOperacionalesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div style={informeStyles.textContent}>
                            <Typography variant="caption">
                              Gastos No Operacionales:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.gastosNoOperacionalesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                          <div  style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                            <Typography variant="caption" >
                              Utilidad Antes De Impuesto:
                            </Typography>
                            <Typography variant="caption">
                              {adjustedTotals.utilidadAntesDeImpuesto.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Typography>
                          </div>
                        </div>
                      )}
                      {Object.entries(zones).map(([zone, { total: zoneTotal, rubros }]) => {

                        let adjustedTotalZone = zoneTotal;

                        // Ajustes para la zona "Nacional"
                        if (applyPercentage) {
                          if (zone === "Nacional") {
                            if (uen === "Constructora") {
                              adjustedTotalZone += nacionalShareConstructoraFinal.total || 0;
                            } else if (uen === "Promotora") {
                              adjustedTotalZone += nacionalSharePromotoraFinal.total || 0;
                            } else if (uen === "Inmobiliaria") {
                              adjustedTotalZone += nacionalShareInmobiliariaFinal.total || 0;
                            }
                          } else {
                            // Ajustes para zonas diferentes a "Nacional"
                            if (uen === "Constructora") {
                              adjustedTotalZone += otherZonesShareConstructoraFinal[zone]?.total || 0;
                            } else if (uen === "Promotora") {
                              adjustedTotalZone += otherZonesSharePromotoraFinal[zone]?.total || 0;
                            } else if (uen === "Inmobiliaria") {
                              adjustedTotalZone += otherZonesShareInmobiliariaFinal[zone]?.total || 0;
                            }
                          }
                        }

                        return (
                          <div key={zone}>
                            <h5>
                              <div style={uen === "Constructora"? informeStyles.uenConstructora: uen === "Inmobiliaria"? informeStyles.uenInmobiliaria: uen === "Unidades de Apoyo"? informeStyles.uenUA: informeStyles.uen}>
                                <Typography sx={{ color: "white" }}>
                                  {zone}:
                                </Typography>
                                {isTotalVisible && (
                                  <Typography sx={{ color: "white" }}>
                                    {adjustedTotalZone.toLocaleString("es-ES", {minimumFractionDigits: 0,maximumFractionDigits: 0,})}
                                  </Typography>
                                )}
                              </div>
                            </h5>
                            {isUtilidadVisible && (
                              <div style={uen == "Constructora"? informeStyles.containerConstructora: uen == "Inmobiliaria"? informeStyles.containerInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.containerUA: informeStyles.container}>
                                <div style={informeStyles.textContent}>
                                  <Typography variant="caption">
                                    Ingresos Operacionales:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].ingresosOperacionalesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={informeStyles.textContent}>
                                  <Typography variant="caption">
                                    Costos de Venta:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].costosDeVentacostosIndirectosTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                                  <Typography variant="caption" >
                                    Utilidad Bruta:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].utilidadBruta.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={informeStyles.textContent}>
                                  <Typography variant="caption">
                                    Gastos de Administración:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].gastosOperacionalesAdministrativosTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={informeStyles.textContent}>
                                  <Typography variant="caption">
                                    Gastos de Comercialización:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].gastosOperacionalesComercialesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                                  <Typography variant="caption">
                                    Utilidad ó (PERDIDA) Operacional:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].utilidadoPerdidaOperacional.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={informeStyles.textContent}>
                                  <Typography variant="caption">
                                    Ingresos No Operacionales:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].ingresosNoOperacionalesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={informeStyles.textContent}>
                                  <Typography variant="caption">
                                    Gastos No Operacionales:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].gastosNoOperacionalesTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                                <div style={uen == "Constructora"? informeStyles.titleZuConstructora: uen == "Inmobiliaria"? informeStyles.titleZuInmobiliaria: uen == "Unidades de Apoyo"? informeStyles.titleZuUA: informeStyles.titleZu}>
                                  <Typography variant="caption">
                                    Utilidad Antes De Impuesto:
                                  </Typography>
                                  <Typography variant="caption">
                                    {totalsByZone[zone].utilidadAntesDeImpuesto.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </Typography>
                                </div>
                              </div>
                            )}
                            {isRubroVisible && (
                              <div>
                                {Object.entries(rubros).map(
                                  ([rubroIndex, { total, subrubros }]) => {
                                    const rubro = updatedRubros[rubroIndex];
                                    return (
                                      <div style={{ margin: "10px" }}key={rubroIndex}>
                                        <div
                                          style={uen == "Constructora"? informeStyles.containerRConstructora: uen == "Inmobiliaria"? informeStyles.containerRInmobiliaria: uen =="Unidades de Apoyo"? informeStyles.containerRUA: informeStyles.containerR}>
                                          <Typography variant="caption" fontWeight='bold'>
                                            {rubro? rubro.nombre: "Rubro no encontrado"}:
                                          </Typography>

                                          {isTotalVisible && (
                                            <Typography variant="caption">
                                              {total.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                            </Typography>
                                          )}
                                        </div>
                                        {isSubrubroVisible && (
                                          <div>
                                            {Object.entries(subrubros).map(
                                              ([subrubroIndex, {total: subrubroTotal, auxiliares,},]) => {
                                                const subrubro = rubro.subrubros[subrubroIndex];
                                                return (
                                                  <div key={subrubroIndex}>
                                                    <div
                                                        style={uen == "Constructora"? informeStyles.containerSRConstructora: uen == "Inmobiliaria"? informeStyles.containerSRInmobiliaria: uen =="Unidades de Apoyo"? informeStyles.containerSRUA: informeStyles.containerSR}>
                                                      <Typography variant="caption">
                                                        {subrubro? subrubro.nombre: "Subrubro no encontrado"}:
                                                      </Typography>
                                                      {isTotalVisible && (
                                                        <Typography variant="caption">
                                                          {subrubroTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                        </Typography>
                                                      )}
                                                    </div>
                                                    {isAuxiliarVisible && (
                                                      <div>
                                                        {Object.entries(
                                                          auxiliares
                                                        ).map(
                                                          ([
                                                            auxIndex,
                                                            {
                                                              total: auxTotal,
                                                              cuentas,
                                                            },
                                                          ]) => {
                                                            const auxiliar = subrubro.auxiliares[auxIndex];
                                                            return (
                                                              <div key={auxIndex}>
                                                                <div
                                                                  style={uen == "Constructora"? informeStyles.containerAConstructora: uen == "Inmobiliaria"? informeStyles.containerAInmobiliaria: uen =="Unidades de Apoyo"? informeStyles.containerAUA: informeStyles.containerA}>
                                                                  <Typography variant="caption">
                                                                    {auxiliar? auxiliar.nombre: "Auxiliar no encontrado"}:
                                                                  </Typography>
                                                                  {isTotalVisible && (
                                                                    <Typography variant="caption">
                                                                      {auxTotal.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                                    </Typography>
                                                                  )}
                                                                </div>
                                                                {isCuentaVisible && (
                                                                  <div>
                                                                    {Object.entries(cuentas).map(
                                                                      ([codigo, {nombre, total,},]) => (
                                                                        <div
                                                                          style={uen =="Constructora"? informeStyles.containerCCConstructora: uen =="Inmobiliaria"? informeStyles.containerCCInmobiliaria: uen =="Unidades de Apoyo"? informeStyles.containerCCUA: informeStyles.containerCC}>
                                                                          <Typography variant="caption">
                                                                            {codigo}{nombre}:
                                                                          </Typography>
                                                                          {isTotalVisible && (
                                                                            <Typography variant="caption">
                                                                              {total.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                                            </Typography>
                                                                          )}
                                                                        </div>
                                                                      )
                                                                    )}
                                                                  </div>
                                                                )}
                                                              </div>
                                                            );
                                                          }
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
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

  const exportToExcel = () => {
    const formattedData = [];
  
    // Organize the data for each UEN and its detailed structure
    Object.entries(data).forEach(([year, uens]) => {
      Object.entries(uens).forEach(([uen, { total: uenTotal, zones }]) => {
        let currentYear = year;
        let currentUEN = uen;
  
        // Add a row for the UEN summary
        // formattedData.push({
        //   Año: currentYear,
        //   UEN: currentUEN,
        //   Zona: "",
        //   CR: "",
        //   Rubro: "",
        //   CS: "",
        //   Subrubro: "",
        //   CA: "",
        //   Auxiliar: "",
        //   CC: "",
        //   "Centro Costos": "",
        //   Totales: uenTotal,
        //   Enero: "",
        //   Febrero: "",
        //   Marzo: "",
        //   Abril: "",
        //   Mayo: "",
        //   Junio: "",
        //   Julio: "",
        //   Agosto: "",
        //   Septiembre: "",
        //   Octubre: "",
        //   Noviembre: "",
        //   Diciembre: "",
        // });
  
        Object.entries(zones).forEach(([zone, { total: zoneTotal, rubros }]) => {
          let currentZone = zone;
  
          // Add a row for each zone within the UEN
          // formattedData.push({
          //   Año: currentYear,
          //   UEN: currentUEN,
          //   Zona: currentZone,
          //   CR: "",
          //   Rubro: "",
          //   CS: "",
          //   Subrubro: "",
          //   CA: "",
          //   Auxiliar: "",
          //   CC: "",
          //   "Centro Costos": "",
          //   Totales: zoneTotal,
          //   Enero: "",
          //   Febrero: "",
          //   Marzo: "",
          //   Abril: "",
          //   Mayo: "",
          //   Junio: "",
          //   Julio: "",
          //   Agosto: "",
          //   Septiembre: "",
          //   Octubre: "",
          //   Noviembre: "",
          //   Diciembre: "",
          // });
  
          Object.entries(rubros).forEach(([rubroIndex, rubroData]) => {
            Object.entries(rubroData.subrubros).forEach(([subrubroIndex, subrubroData]) => {
              Object.entries(subrubroData.auxiliares).forEach(([auxiliarIndex, auxiliarData]) => {
                Object.entries(auxiliarData.cuentas).forEach(([cuentaCodigo, cuentaData]) => {

                  const monthlyValues = cuentaData.meses_presupuesto || [];
                  formattedData.push({
                    Año: currentYear,
                    UEN: currentUEN,
                    Zona: currentZone,
                    CR: updatedRubros[rubroIndex]?.codigo || "",
                    Rubro: updatedRubros[rubroIndex]?.nombre || "",
                    CS: updatedRubros[rubroIndex]?.subrubros?.[subrubroIndex]?.codigo || "",
                    Subrubro: updatedRubros[rubroIndex]?.subrubros?.[subrubroIndex]?.nombre || "",
                    CA: updatedRubros[rubroIndex]?.subrubros?.[subrubroIndex]?.auxiliares?.[auxiliarIndex]?.codigo || "",
                    Auxiliar: updatedRubros[rubroIndex]?.subrubros?.[subrubroIndex]?.auxiliares?.[auxiliarIndex]?.nombre || "",
                    CC: cuentaCodigo,
                    "Centro Costos": cuentaData.nombre,
                    Totales: cuentaData.total,
                    Enero: monthlyValues[0],
                    Febrero: monthlyValues[1],
                    Marzo: monthlyValues[2],
                    Abril: monthlyValues[3],
                    Mayo: monthlyValues[4],
                    Junio: monthlyValues[5],
                    Julio: monthlyValues[6],
                    Agosto: monthlyValues[7],
                    Septiembre: monthlyValues[8],
                    Octubre: monthlyValues[9],
                    Noviembre: monthlyValues[10],
                    Diciembre: monthlyValues[11],
                  });
                });
              });
            });
          });
        });
  
        // Add an empty row after each UEN for separation in Excel
        formattedData.push({});
      });
    });
  
    // Create a new workbook and add the data
    const worksheet = XLSX.utils.json_to_sheet(formattedData, {
      header: [
        "Año",
        "UEN",
        "Zona",
        "CR",
        "Rubro",
        "CS",
        "Subrubro",
        "CA",
        "Auxiliar",
        "CC",
        "Centro Costos",
        "Totales",
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ],
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Informe Detallado");
  
    // Export to Excel
    XLSX.writeFile(workbook, `Informe_Detallado_${new Date().getFullYear()}.xlsx`);
  };
  

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <Sidebar />
      <div style={{ display: "flex", width: "100%", flexDirection: "column" }}>
        <div style={{display: "flex",flexDirection: "row",marginBottom: "10px",justifyContent: "flex-end",alignItems: "center",}}>
           <FormGroup sx={{ display: "flex", flexDirection: "row", justifyContent: "flex-end" }}>
           
            <FormControlLabel
              key="total" // Unique key
              control={<Checkbox checked={isTotalVisible}onChange={handleTotalToggle}color="primary"style={{ marginLeft: "10px" }}/>}
              label="Ver Totales"
            />
            <FormControlLabel
              key="utilidad" // Unique key
              control={<Checkbox checked={isUtilidadVisible}onChange={handleUtilidadToggle}color="primary"style={{ marginLeft: "10px" }}/>}
              label="Ver Proyecciones De Estados"
            />
            <FormControlLabel
              key="rubro" // Unique key
              control={<Checkbox checked={isRubroVisible}onChange={() => setIsRubroVisible(!isRubroVisible)}color="primary"style={{ marginLeft: "10px" }}/>}
              label="Ver Rubros"
            />
            <FormControlLabel
              key="subrubro" // Unique key
              control={<Checkbox checked={isSubrubroVisible}onChange={() => setIsSubrubroVisible(!isSubrubroVisible)}color="primary"style={{ marginLeft: "10px" }}/>}
              label="Ver Subrubros"
            />
            <FormControlLabel
              key="auxiliar" // Unique key
              control={<Checkbox checked={isAuxiliarVisible}onChange={() => setIsAuxiliarVisible(!isAuxiliarVisible)}color="primary"style={{ marginLeft: "10px" }}/>}
              label="Ver Auxiliares"
            />
            <FormControlLabel
              key="cuenta" // Unique key
              control={<Checkbox checked={isCuentaVisible}onChange={() => setIsCuentaVisible(!isCuentaVisible)}color="primary"style={{ marginLeft: "10px" }}/>}
              label="Ver Cuentas"
            />
            <FormControlLabel
              control={<Checkbox checked={applyPercentage} onChange={handleApplyPercentageToggle} color="primary" style={{ marginLeft: "10px" }} />}
              label="% UA"
            />
            <Button variant="contained" color="success" onClick={exportToExcel}>
              Exportar a Excel
            </Button>
          </FormGroup>
        </div>
        
        {loading ? (
          <p>
            <LoadingModal open={loading} />
          </p>
        ) : (
          renderData(data)
        )}
      </div>
    </div>
  );
};

export default Detallado;