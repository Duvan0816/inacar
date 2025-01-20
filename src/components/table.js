import React, { useEffect, useState, useRef } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AutorenewIcon from '@mui/icons-material/Autorenew';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import {
  Accordion,
  Autocomplete,
  SpeedDial,
  Button,
  Dialog,
  DialogTitle,
  AccordionSummary,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
  useMediaQuery,
  SpeedDialAction,
} from "@mui/material";
import HoverButton from "./hoverButton";
import styles from "../styles/table";
import { getCookie } from "../utils/cookieUtils";
import { Snackbar, Alert } from "@mui/material";
import * as XLSX from "xlsx";
import { useRouter } from "next/router";
import { openDB } from "idb";
import LoadingModal from "@/components/loading";

const CustomTable = ({
  MONTHS,
  rubrosTotals,
  setRubrosTotals,
  setInputValues,
  inputValues,
  updatedRubros,
  setUpdatedRubros,
  uen,
  setMonthlyTotals,
  monthlyTotals,
  updatedcentroCostos,
  userId,
  CentroCostoid,
  setCentroCostoid,
  initDB,
  isLoading,
  setIsLoading,
}) => {
  const [opens, setOpens] = useState(false); // Controla si el Snackbar está abierto
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedRubro, setSelectedRubro] = useState("");
  const [selectedSubrubro, setSelectedSubrubro] = useState("");
  const [selectedAuxiliar, setSelectedAuxiliar] = useState("");
  const [newItem, setNewItem] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);
  const [opacity, setOpacity] = useState(0.5);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [isUsed, setIsUsed] = useState(false);
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const handleClose = () => setOpen(false);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const [selectedRubroIndex, setSelectedRubroIndex] = useState(null);
  const [selectedSubrubroIndex, setSelectedSubrubroIndex] = useState(null);
  const [selectedAuxiliarIndex, setSelectedAuxiliarIndex] = useState(null);
  const currentView = router.pathname.split("/")[2];
  const SELECTED_PRESUPUESTO_KEY = `${currentView}_selectedPresupuesto`;
  const RUBROS_DATA_KEY = `${currentView}_rubrosData`;

  const handleCloseSnackbar = () => {
    setOpen(false); // Cierra el Snackbar
  };

  const deleteDataFromDB = async (store, key) => {
    try {
      const db = await initDB();
      await db.delete(store, key);
    } catch (error) {
      console.error("Error deleting from IndexedDB:", error);
    }
  };
  useEffect(() => {
    const debounceSave = setTimeout(() => {
      const savedData = {
        inputs: inputValues,
      };
      localStorage.setItem(`${currentView}_rubrosData`, JSON.stringify(savedData));
    }, 500);
    
    return () => clearTimeout(debounceSave);
  }, [currentView, inputValues]);

  const handleMouseLeave = () => {
    setOpacity(0.5);
  };
  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleOpen = (rubroIndex, subrubroIndex, auxiliarIndex) => {
    setSelectedRubroIndex(rubroIndex);
    setSelectedSubrubroIndex(subrubroIndex);
    setSelectedAuxiliarIndex(auxiliarIndex);
    setOpen(true);
  };

  const year = (new Date().getFullYear() + 1).toString().slice(-2);

  const handleInputChange = (value, monthIndex, rubroName, inputId) => {
    const numericValue = parseFloat(value) || 0;
    const previousValue = inputValues[inputId]?.value || 0;
    const difference = numericValue - previousValue;
  
    setInputValues((prevInputValues) => {
      const previousData = prevInputValues[inputId] || {};
  
      // Buscar un inputId relacionado que coincida excepto en el último dígito (mes)
      const relatedInputId = Object.keys(prevInputValues).find((key) => {
        // Comparar todos los segmentos del inputId excepto el último (mes)
        const baseInputId = key.split("-").slice(0, -1).join("-");
        return baseInputId === inputId.split("-").slice(0, -1).join("-");
      });
  
      // Obtener id y centroCostoid del input relacionado
      const relatedData = relatedInputId ? prevInputValues[relatedInputId] : {};
      const centroCostoidValue = relatedData.centroCostoid || null;
      const idValue = relatedData.id || null;
  
      // Actualizar inputValues con el nuevo valor, manteniendo id y centroCostoid
      const updatedInputValues = {
        ...prevInputValues,
        [inputId]: {
          ...previousData,
          value: numericValue,
          centroCostoid: centroCostoidValue, // Repetir centroCostoid del mes relacionado
          id: idValue, // Repetir id del mes relacionado
          rubro: relatedData.rubro || 0, // Mantener rubro, subrubro, auxiliar e item si están definidos
          subrubro: relatedData.subrubro || 0,
          auxiliar: relatedData.auxiliar || 0,
          item: relatedData.item || 0,
          meses: monthIndex, // Actualizar el mes actual
        },
      };
  
      // Save the updated data in localStorage asynchronously
      setTimeout(() => {
        try {
          localStorage.setItem("inputValuesKey", JSON.stringify(updatedInputValues));
          console.log("Datos guardados en localStorage");
        } catch (error) {
          console.error("Error al guardar en localStorage:", error);
        }
      }, 0);
  
      return updatedInputValues;
    });
  
    // Update monthly and rubro totals
    setMonthlyTotals((prevTotals) => {
      const newTotals = [...prevTotals];
      newTotals[monthIndex] = (newTotals[monthIndex] || 0) + difference;
      return newTotals;
    });
  
    setRubrosTotals((prevRubrosTotals) => {
      const updatedTotals = { ...prevRubrosTotals };
      if (!updatedTotals[rubroName]) {
        updatedTotals[rubroName] = Array(12).fill(0);
      }
      updatedTotals[rubroName][monthIndex] = (updatedTotals[rubroName][monthIndex] || 0) + difference;
      return updatedTotals;
    });
  };
  

  const handleAddItem = () => {
    // Check for required values
    if (
      selectedRubroIndex === null ||
      selectedSubrubroIndex === null ||
      selectedAuxiliarIndex === null ||
      !CentroCostoid ||
      !newItem
    ) {
      setSnackbarMessage(
        "Faltan valores requeridos: Rubro, Subrubro, Auxiliar, Centro de Costo o Nuevo Item"
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const rubro = updatedRubros[selectedRubroIndex];
    const subrubro = rubro.subrubros[selectedSubrubroIndex];
    const auxiliar = subrubro.auxiliares[selectedAuxiliarIndex];

    if (auxiliar) {
      // Add new item to the list of items
      const itemsArray = auxiliar.items || [];
      itemsArray.push({ nombre: newItem, centroCostoid: CentroCostoid });
      auxiliar.items = itemsArray;

      const updatedRubrosCopy = [...updatedRubros];
      updatedRubrosCopy[selectedRubroIndex].subrubros[
        selectedSubrubroIndex
      ].auxiliares[selectedAuxiliarIndex] = auxiliar;

      // Clear fields and close dialog
      setUpdatedRubros(updatedRubrosCopy);
      setNewItem("");
      setOpen(false);
    } else {
      console.error("Auxiliar no encontrado");
      setSnackbarMessage("Auxiliar no encontrado");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleRemoveItem = async (
    rubroIndex,
    subrubroIndex,
    auxiliarIndex,
    itemIndex
  ) => {
    const updatedRubrosCopy = [...updatedRubros];
    const data = Object.keys(inputValues).map((inputId) => {
      const inputValue1 = inputValues[inputId];
      return {
        id: parseInt(inputValue1.id),
      };
    });

    // Get the auxiliar and remove the item
    const auxiliar =
      updatedRubrosCopy[rubroIndex].subrubros[subrubroIndex].auxiliares[
        auxiliarIndex
      ];
    const itemValue = auxiliar.items[itemIndex];

    if (itemValue) {
      auxiliar.items.splice(itemIndex, 1); // Remove the item

      const updatedInputValues = { ...inputValues };
      const newMonthlyTotals = [...monthlyTotals];
      const newRubrosTotals = { ...rubrosTotals };

      // Update inputValues, monthly totals, and rubros totals
      MONTHS.forEach((_, monthIndex) => {
        const inputId = `outlined-basic-${rubroIndex}-${subrubroIndex}-${auxiliarIndex}-${itemIndex}-${monthIndex}`;
        const value = parseFloat(updatedInputValues[inputId]?.value) || 0;

        newMonthlyTotals[monthIndex] -= value;

        if (newRubrosTotals[updatedRubrosCopy[rubroIndex].nombre]) {
          newRubrosTotals[updatedRubrosCopy[rubroIndex].nombre][monthIndex] -=
            value;
        }

        // Clean up inputValues if the item is deleted
        if (inputId in updatedInputValues) {
          delete updatedInputValues[inputId];
        }
      });

      // Check if all monthly totals for the rubro are zero and delete if so
      if (
        newRubrosTotals[updatedRubrosCopy[rubroIndex].nombre]?.every(
          (val) => val === 0
        )
      ) {
        delete newRubrosTotals[updatedRubrosCopy[rubroIndex].nombre];
      }

      // Send API request to delete the item
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const csrftoken = getCookie("csrftoken");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/presupuestos/batch-delete/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrftoken,
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(data), // Sending just the deleted item's ID
      });

      await deleteDataFromDB("selectedPresupuesto", SELECTED_PRESUPUESTO_KEY);
      await deleteDataFromDB("rubrosData", RUBROS_DATA_KEY);

      if (response.ok) {
        setSnackbarMessage(`Presupuesto eliminado exitosamente.`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        setUpdatedRubros(updatedRubrosCopy);
        setInputValues(updatedInputValues);
        setMonthlyTotals(newMonthlyTotals);
        setRubrosTotals(newRubrosTotals);
      } else {
        console.error("Error al eliminar el ítem");
      }
    } else {
      console.error("Item no encontrado");
    }
  };

  const calculateAnnualTotal = (totals) => {
    return totals.reduce((acc, curr) => acc + Math.round(parseFloat(curr) || 0), 0);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const exportRubrosToExcel = () => {
    const wb = XLSX.utils.book_new();
    const data = [];
  
    // Encabezados de la hoja de Excel
    const headers = [
      "ID",
      "Rubros",
      "Subrubros",
      "Auxiliares",
      "Centro De Costos",
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
    ];
    data.push(headers);
  
    // Recorrer rubros, subrubros y auxiliares
    updatedRubros.forEach((rubro) => {
      if (Array.isArray(rubro.subrubros)) {
        rubro.subrubros.forEach((subrubro) => {
          if (Array.isArray(subrubro.auxiliares)) {
            subrubro.auxiliares.forEach((auxiliar) => {
              if (Array.isArray(auxiliar.items)) {
                auxiliar.items.forEach((item, itemIndex) => {
                  
                  // Encontrar el primer mes con un ID válido
                  let idValue = null;
                  for (let monthIndex = 0; monthIndex < MONTHS.length; monthIndex++) {
                    const inputId = `outlined-basic-${updatedRubros.indexOf(rubro)}-${rubro.subrubros.indexOf(subrubro)}-${subrubro.auxiliares.indexOf(auxiliar)}-${itemIndex}-${monthIndex}`;
                    const monthData = inputValues[inputId];
                    if (monthData && monthData.id) {
                      idValue = monthData.id;
                      break;  // Stop as soon as we find the first valid ID
                    }
                  }
                  // Crear fila de datos con los IDs agrupados por mes
                  const row = [
                    idValue, // Use the ID value collected for the first month
                    `${rubro.codigo} ${rubro.nombre}`,
                    `${subrubro.codigo} ${subrubro.nombre}`,
                    `${auxiliar.codigo} ${auxiliar.nombre}`,
                    item.nombre.trim().replace(/\s+/g, " "),
                  ];
  
                  // Agregar valores mensuales a la fila
                  MONTHS.forEach((_, monthIndex) => {
                    const inputId = `outlined-basic-${updatedRubros.indexOf(rubro)}-${rubro.subrubros.indexOf(subrubro)}-${subrubro.auxiliares.indexOf(auxiliar)}-${itemIndex}-${monthIndex}`;
                    const inputValue = inputValues[inputId]?.value;
  
                    // Asegurarse de que inputValue sea un número o 0
                    const value = inputValue !== undefined ? parseFloat(inputValue) : 0;
                    row.push(value);
                  });
  
                  data.push(row);
                });
              }
            });
          }
        });
      }
    });
  
    // Crear hoja y ajustar ancho de columnas
    const ws = XLSX.utils.aoa_to_sheet(data);
    const maxLengths = headers.map((header, i) =>
      Math.max(
        header.length,
        ...data.map((row) => (row[i] ? row[i].toString().length : 0))
      )
    );
    ws["!cols"] = maxLengths.map((length) => ({ wch: length + 2 }));
  
    // Añadir la hoja de Excel al libro
    XLSX.utils.book_append_sheet(wb, ws, "Rubros");
  
    // Escribir el archivo Excel
    XLSX.writeFile(wb, `${uen}.xlsx`);
  
    setTimeout(async () => {
      await deleteDataFromDB("selectedPresupuesto", SELECTED_PRESUPUESTO_KEY);
      await deleteDataFromDB("rubrosData", RUBROS_DATA_KEY);
      window.location.reload();
    }, 500);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      processImportedData(jsonData);
    }
  };

  const handleSpeedDialClick = () => {
    fileInputRef.current.click();
  };

  const processImportedData = (data) => {
    const newInputValues = { ...inputValues };
    const newMonthlyTotals = [...monthlyTotals];
    const newRubrosTotals = { ...rubrosTotals };
  
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const id = row[0] ? parseInt(String(row[0]).trim()) : null; // Un único ID para todos los meses
      const rubroData = row[1] ? String(row[1]).trim().split(" ") : [];
      const rubroCodigo = rubroData[0]?.trim() || "";
      const rubroName = rubroData.slice(1).join(" ").trim();
  
      const subrubroData = row[2] ? String(row[2]).trim().split(" ") : [];
      const subrubroCodigo = subrubroData[0]?.trim() || "";
      const subrubroName = subrubroData.slice(1).join(" ").trim();
  
      const auxiliarData = row[3] ? String(row[3]).trim().split(" ") : [];
      const auxiliarCodigo = auxiliarData[0]?.trim() || "";
      const auxiliarName = auxiliarData.slice(1).join(" ").trim();
  
      const itemName = row[4]?.trim() || "";
      const itemCodigo = itemName.split(" ")[0] || "";
      const monthlyValues = row.slice(5, 17);
  
      if (monthlyValues.every((val) => val === 0 || val === null)) continue;
  
      // Find rubro
      const rubro = updatedRubros.find((r) => r.codigo.toString() === rubroCodigo);
      if (!rubro) {
        const mensaje = `No existe el rubro: ${rubroCodigo} ${rubroName}`;
        console.log(mensaje);
        setMessage(mensaje);
        setOpens(true);
        continue;
      }
  
      // Find subrubro
      const subrubro = rubro.subrubros.find(
        (sr) => sr.codigo.toString() === subrubroCodigo
      );
      if (!subrubro) {
        const mensaje = `No existe el subrubro: ${subrubroCodigo} ${subrubroName} en ${rubroCodigo}`;
        console.log(mensaje);
        setMessage(mensaje);
        setOpens(true);
        continue;
      }
  
      // Find auxiliar
      const auxiliar = subrubro.auxiliares.find(
        (a) => a.codigo.toString() === auxiliarCodigo
      );
      if (!auxiliar) {
        const mensaje = `No existe el auxiliar: ${auxiliarCodigo} ${auxiliarName}`;
        console.log(mensaje);
        setMessage(mensaje);
        setOpens(true);
        continue;
      }
  
      // Process monthly values
      auxiliar.items = auxiliar.items || [];
      const item = { nombre: itemName };
  
      monthlyValues.forEach((monthValue, monthIndex) => {
        const numericValue = monthValue || 0;
        if (numericValue !== 0) {
          const inputId = `outlined-basic-${updatedRubros.indexOf(
            rubro
          )}-${rubro.subrubros.indexOf(subrubro)}-${subrubro.auxiliares.indexOf(
            auxiliar
          )}-${auxiliar.items.length}-${monthIndex}`;
  
          newInputValues[inputId] = {
            value: numericValue,
            centroCostoid: itemCodigo,
            id: id,
          };
  
          newRubrosTotals[rubroName] = newRubrosTotals[rubroName] || Array(12).fill(0);
          newRubrosTotals[rubroName][monthIndex] += numericValue;
  
          newMonthlyTotals[monthIndex] += numericValue;
          item[inputId] = numericValue;
        }
      });
  
      if (Object.keys(item).length > 1) {
        auxiliar.items.push(item);
      }
    }
  
    setUpdatedRubros([...updatedRubros]);
    setInputValues(newInputValues);
    setRubrosTotals(newRubrosTotals);
    setMonthlyTotals(newMonthlyTotals);
  };
  

  const handleUpdatePresupuesto = async () => {
    setIsLoading(true);

    const csrftoken = getCookie("csrftoken");
    const token = localStorage.getItem("token");

    const parseInputId = (id) => {
      const [_, basic, rubroIndex, subrubroIndex, auxiliarIndex, itemIndex, colIndex] = id.split("-");
      return {
          rubro: parseInt(rubroIndex),
          subrubro: parseInt(subrubroIndex),
          auxiliar: parseInt(auxiliarIndex),
          item: parseInt(itemIndex),
          meses: parseInt(colIndex),
      };
    };
    
    const data = Object.keys(inputValues).map((inputId) => {
        const parsed = parseInputId(inputId);
        const presupuestomes = parseInt(inputValues[inputId]?.value) || 0;
    
        return {
            id: parseInt(inputValues[inputId]?.id) || null,
            cuenta: parseInt(inputValues[inputId]?.centroCostoid) || null,
            ...parsed,
            usuario: userId,
            uen,
            updatedRubros,
            rubrosTotals,
            monthlyTotals,
            mesesData: [{ meses: parsed.meses, presupuestomes: Math.round(presupuestomes) }],
        };
    });
  
    const chunkDataByCuenta = (data, minSize, maxSize) => {
      let result = [];
      let currentChunk = [];
      let currentCuenta = null;
  
      data.forEach((item) => {
          if (currentCuenta !== item.cuenta && currentChunk.length > 0) {
              result.push([...currentChunk]);
              currentChunk = [];
          }
  
          currentCuenta = item.cuenta;
          currentChunk.push(item);
  
          if (currentChunk.length >= maxSize) {
              result.push([...currentChunk]);
              currentChunk = [];
          }
      });
  
      if (currentChunk.length > 0) {
          result.push([...currentChunk]);
      }
  
      return result;
    };
    const dataChunks = chunkDataByCuenta(data, 205, 220);
    let totalUpdated = 0;
    let totalCreated = 0;

    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        for (const chunk of dataChunks) {
            const response = await fetch(`${API_URL}/presupuestos/batch-update/`, {
                method: "PATCH",
                headers: {
                    "X-CSRFToken": csrftoken,
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
                credentials: "include",
            });

            if (!response.ok) {
                const errorDetail = await response.text();
                console.error("Error response:", errorDetail);
                throw new Error(`Error en respuesta del servidor: ${response.status}`);
            }

            const result = await response.json();
            totalUpdated += result.updated || 0;
            totalCreated += result.created || 0;
        }

        setSnackbarMessage(`Presupuesto actualizado con éxito: ${totalUpdated} modificados, ${totalCreated} creados.`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Limpiar datos locales
        await deleteDataFromDB("selectedPresupuesto", SELECTED_PRESUPUESTO_KEY);
        await deleteDataFromDB("rubrosData", RUBROS_DATA_KEY);
    } catch (error) {
        console.error("Error al actualizar el presupuesto:", error);
        setSnackbarMessage("Error al actualizar el presupuesto.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
    } finally {
        setIsLoading(false);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
  };
  
  const PresupuestoActualizado = async () => {
    setIsLoading(true);

    const csrftoken = getCookie("csrftoken");
    const token = localStorage.getItem("token");

    const data = Object.keys(inputValues).map((inputId) => {
        const [
            _,
            basic,
            rubroIndex,
            subrubroIndex,
            auxiliarIndex,
            itemIndex,
            colIndex, // 'meses'
        ] = inputId.split("-");

        const inputValue = inputValues[inputId];
        const presupuestomes = parseInt(inputValue?.value) || 0;

        return {
            id: isNaN(parseInt(inputValue.id)) ? null : parseInt(inputValue.id),
            cuenta: isNaN(parseInt(inputValue.centroCostoid)) ? null : parseInt(inputValue.centroCostoid),
            usuario: userId,
            uen,
            rubro: parseInt(rubroIndex),
            subrubro: parseInt(subrubroIndex),
            auxiliar: parseInt(auxiliarIndex),
            item: parseInt(itemIndex),
            updatedRubros,
            rubrosTotals,
            monthlyTotals,
            mesesData: [
                {
                    meses: parseInt(colIndex),
                    presupuestomes: Math.round(presupuestomes),
                },
            ],
        };
    });

    const chunkDataByCuenta = (data, minSize, maxSize) => {
      let result = [];
      let currentChunk = [];
      let currentCuenta = null;
  
      data.forEach((item) => {
          if (currentCuenta !== item.cuenta && currentChunk.length > 0) {
              result.push([...currentChunk]);
              currentChunk = [];
          }
  
          currentCuenta = item.cuenta;
          currentChunk.push(item);
  
          if (currentChunk.length >= maxSize) {
              result.push([...currentChunk]);
              currentChunk = [];
          }
      });
  
      if (currentChunk.length > 0) {
          result.push([...currentChunk]);
      }
  
      return result;
    };
    const dataChunks = chunkDataByCuenta(data, 205, 220);
    let totalUpdated = 0;
    let totalCreated = 0;

    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        for (const chunk of dataChunks) {
            const response = await fetch(`${API_URL}/presupuestosActualizado/batch-update/`, {
                method: "PATCH",
                headers: {
                    "X-CSRFToken": csrftoken,
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
                credentials: "include",
            });

            if (!response.ok) {
                const errorDetail = await response.text(); // Registrar detalles del error
                console.error("Error response:", errorDetail);
                throw new Error(`Error en respuesta del servidor: ${response.status}`);
            }

            const result = await response.json();
            totalUpdated += result.updated || 0;
            totalCreated += result.created || 0;
        }

        setSnackbarMessage(`Presupuesto actualizado con éxito: ${totalUpdated} modificados, ${totalCreated} creados.`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Limpiar datos locales
        await deleteDataFromDB("selectedPresupuesto", SELECTED_PRESUPUESTO_KEY);
        await deleteDataFromDB("rubrosData", RUBROS_DATA_KEY);
    } catch (error) {
        console.error("Error al actualizar el presupuesto:", error);
        setSnackbarMessage("Error al actualizar el presupuesto.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
    } finally {
        setIsLoading(false);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
  };

  const PresupuestoEjecutado = async () => {
    setIsLoading(true);

    const csrftoken = getCookie("csrftoken");
    const token = localStorage.getItem("token");

    const parseInputId = (id) => {
      const [_, basic, rubroIndex, subrubroIndex, auxiliarIndex, itemIndex, colIndex] = id.split("-");
      return {
          rubro: parseInt(rubroIndex),
          subrubro: parseInt(subrubroIndex),
          auxiliar: parseInt(auxiliarIndex),
          item: parseInt(itemIndex),
          meses: parseInt(colIndex),
      };
    };
    
    const data = Object.keys(inputValues).map((inputId) => {
        const parsed = parseInputId(inputId);
        const presupuestomes = parseInt(inputValues[inputId]?.value) || 0;
    
        return {
            id: parseInt(inputValues[inputId]?.id) || null,
            cuenta: parseInt(inputValues[inputId]?.centroCostoid) || null,
            ...parsed,
            usuario: userId,
            uen,
            updatedRubros,
            rubrosTotals,
            monthlyTotals,
            mesesData: [{ meses: parsed.meses, presupuestomes: Math.round(presupuestomes) }],
        };
    });
  
    const chunkDataByCuenta = (data, minSize, maxSize) => {
      let result = [];
      let currentChunk = [];
      let currentCuenta = null;
  
      data.forEach((item) => {
          if (currentCuenta !== item.cuenta && currentChunk.length > 0) {
              result.push([...currentChunk]);
              currentChunk = [];
          }
  
          currentCuenta = item.cuenta;
          currentChunk.push(item);
  
          if (currentChunk.length >= maxSize) {
              result.push([...currentChunk]);
              currentChunk = [];
          }
      });
  
      if (currentChunk.length > 0) {
          result.push([...currentChunk]);
      }
  
      return result;
    };
    const dataChunks = chunkDataByCuenta(data, 205, 220);
    let totalUpdated = 0;
    let totalCreated = 0;

    try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        for (const chunk of dataChunks) {
            const response = await fetch(`${API_URL}/presupuestoEjecutado/batch-update/`, {
                method: "PATCH",
                headers: {
                    "X-CSRFToken": csrftoken,
                    Authorization: `Token ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
                credentials: "include",
            });

            if (!response.ok) {
                const errorDetail = await response.text();
                console.error("Error response:", errorDetail);
                throw new Error(`Error en respuesta del servidor: ${response.status}`);
            }

            const result = await response.json();
            totalUpdated += result.updated || 0;
            totalCreated += result.created || 0;
        }

        setSnackbarMessage(`Presupuesto actualizado con éxito: ${totalUpdated} modificados, ${totalCreated} creados.`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        // Limpiar datos locales
        await deleteDataFromDB("selectedPresupuesto", SELECTED_PRESUPUESTO_KEY);
        await deleteDataFromDB("rubrosData", RUBROS_DATA_KEY);
    } catch (error) {
        console.error("Error al actualizar el presupuesto:", error);
        setSnackbarMessage("Error al actualizar el presupuesto.");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
    } finally {
        setIsLoading(false);
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
  };
  
  return (
    <>
      <div style={{ marginLeft: 5 }}>
        <table style={styles.tableContainer}>
          <thead>
            <tr>
              <th style={styles.tableCell}>
                <Typography>Rubro/Mes</Typography>
              </th>
              {[
                "Ene",
                "Feb",
                "Mar",
                "Abr",
                "May",
                "Jun",
                "Jul",
                "Ago",
                "Sep",
                "Oct",
                "Nov",
                "Dic",
              ].map((month, index) => (
                <th key={index} style={styles.tableCell}>
                  <Typography variant="body1">{month}</Typography>
                </th>
              ))}
              <th style={styles.tableCell}>
                <Typography>Total Anual</Typography>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rubrosTotals).map(([rubroName, totals], index) => (
              <tr key={index}>
                <td style={styles.tableCell}>
                  <Typography variant="caption">{rubroName}</Typography>
                </td>
                {totals.map((total, monthIndex) => {
                  const parsedTotal = parseFloat(total);
                  const validTotal = isNaN(parsedTotal) ? 0 : Math.round(parsedTotal);
                  return (
                    <td key={monthIndex} style={styles.totalCell(validTotal)}>
                      <Typography>
                        {validTotal.toLocaleString("es-ES")} 
                      </Typography>
                    </td>
                  );
                })}
                <td style={styles.totalCell(calculateAnnualTotal(totals))}>
                  <Typography>
                    {Math.round(calculateAnnualTotal(totals)).toLocaleString(
                      "es-ES"
                    )}
                  </Typography>
                </td>
              </tr>
            ))}
            <tr>
              <td style={styles.tableCell}>
                <Typography>Total General</Typography>
              </td>
              {monthlyTotals.map((total, index) => {
                const parsedTotal = parseFloat(total); 
                const validTotal = isNaN(parsedTotal) ? 0 : Math.round(parsedTotal);
                return (
                  <td key={index} style={styles.totalCell(validTotal)}>
                    <Typography>
                      {validTotal.toLocaleString("es-ES")} 
                    </Typography>
                  </td>
                );
              })}
              <td style={styles.totalCell(calculateAnnualTotal(monthlyTotals))}>
                <Typography>
                  {Math.round(
                    calculateAnnualTotal(monthlyTotals)
                  ).toLocaleString("es-ES")}
                </Typography>
              </td>
            </tr>
          </tbody>
        </table>
        <table
          style={
            router.pathname === "/uen/constructora"
              ? styles.tableConstructora
              : router.pathname === "/uen/inmobiliaria"
              ? styles.tableInmobiliaria
              : router.pathname === "/uen/unidad-apoyo"
              ? styles.tableUA
              : styles.table
          }
        >
          <thead>
            <tr style={{ width: "100%" }}>
              <th style={styles.tableHeader}>
                <Typography>Rubro</Typography>
              </th>
              {MONTHS.map((month, index) => (
                <th style={styles.monthHeader} key={index}>
                  <Typography>
                    {month} {year}
                  </Typography>
                </th>
              ))}
              <th style={styles.tableCell}>
                <Typography>Total Anual</Typography>
              </th>
            </tr>
          </thead>
        </table>
        {updatedRubros.map((rubro, rubroIndex) => (
          <Accordion key={rubroIndex}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${rubroIndex}-content`}
              id={`panel${rubroIndex}-header`}
              sx={
                router.pathname === "/uen/constructora"
                  ? styles.accordionSummaryConstructora
                  : router.pathname === "/uen/inmobiliaria"
                  ? styles.accordionSummaryInmobiliaria
                  : router.pathname === "/uen/unidad-apoyo"
                  ? styles.accordionSummaryUA
                  : styles.accordionSummary
              }
            >
              <Typography>{`${rubro.codigo} - ${rubro.nombre}`}</Typography>
            </AccordionSummary>

            {rubro.subrubros.map((subrubro, subrubroIndex) => (
              <Accordion key={subrubroIndex} sx={{ marginLeft: 2 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`panel${rubroIndex}-${subrubroIndex}-content`}
                  id={`panel${rubroIndex}-${subrubroIndex}-header`}
                  sx={
                    router.pathname === "/uen/constructora"
                      ? styles.subAccordionSummaryConstructora
                      : router.pathname === "/uen/inmobiliaria"
                      ? styles.subAccordionSummaryInmobiliaria
                      : router.pathname === "/uen/unidad-apoyo"
                      ? styles.subAccordionSummaryUA
                      : styles.subAccordionSummary
                  }
                >
                  <Typography>{`${subrubro.codigo} - ${subrubro.nombre}`}</Typography>
                </AccordionSummary>

                {Array.isArray(subrubro.auxiliares) &&
                  subrubro.auxiliares.map((auxiliar, auxiliarIndex) => (
                    <Accordion key={auxiliarIndex} sx={{ marginLeft: 4 }}>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel${rubroIndex}-${subrubroIndex}-${auxiliarIndex}-content`}
                        id={`panel${rubroIndex}-${subrubroIndex}-${auxiliarIndex}-header`}
                        sx={{
                          ...(router.pathname === "/uen/constructora"
                            ? styles.accordionSummaryConstructora
                            : router.pathname === "/uen/inmobiliaria"
                            ? styles.accordionSummaryInmobiliaria
                            : router.pathname === "/uen/unidad-apoyo"
                            ? styles.accordionSummaryUA
                            : styles.accordionSummary),
                        }}
                      >
                        {/* Mostrar el código y nombre del auxiliar */}
                        <Typography>{`${auxiliar.codigo} - ${auxiliar.nombre}`}</Typography>
                      </AccordionSummary>

                      {/* Aquí va el contenido adicional para cada auxiliar */}
                      <AccordionSummary>
                        {auxiliar.items && auxiliar.items.length > 0 ? (
                          <table style={{ width: "500px" }}>
                            <tbody>
                              {auxiliar.items.map((item, itemIndex) => (
                                <tr key={itemIndex}>
                                  <td style={styles.itemCell}>
                                    <Typography>{item.nombre}</Typography>
                                    <HoverButton
                                      onRemove={() =>
                                        handleRemoveItem(
                                          rubroIndex,
                                          subrubroIndex,
                                          auxiliarIndex,
                                          itemIndex
                                        )
                                      }
                                    />
                                  </td>
                                  {MONTHS.map((_, colIndex) => {
                                    const inputId = `outlined-basic-${rubroIndex}-${subrubroIndex}-${auxiliarIndex}-${itemIndex}-${colIndex}`;
                                    return (
                                      <td key={colIndex}>
                                        <input
                                          type="number"
                                          id={inputId}
                                          style={{ ...styles.input, fontWeight: "bold" }}
                                          value={
                                            inputValues[inputId]?.value || ""
                                          }
                                          onChange={(e) =>
                                            handleInputChange(
                                              e.target.value,
                                              colIndex,
                                              rubro.nombre,
                                              inputId
                                            )
                                          }
                                          // disabled={true}
                                        />
                                      </td>
                                    );
                                  })}
                                  <td>
                                    {(() => {
                                      // Verificar que `inputValues` esté definido y calcular el total
                                      const total = MONTHS.reduce(
                                        (sum, _, colIndex) => {
                                          const inputId = `outlined-basic-${rubroIndex}-${subrubroIndex}-${auxiliarIndex}-${itemIndex}-${colIndex}`;
                                          return (
                                            sum +
                                            (parseFloat(
                                              inputValues[inputId]?.value
                                            ) || 0)
                                          );
                                        },
                                        0
                                      );

                                      // return <Typography>{Number.isNaN(total) ? 0 : total}</Typography>; // Mostrar 0 si total es NaN o falsy
                                      return (
                                        <Typography>
                                          {total.toLocaleString("es-ES")}
                                        </Typography>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <Typography
                            sx={{ color: "#ABABAB", textAlign: "center" }}
                          >
                            No hay items disponibles
                          </Typography>
                        )}
                      </AccordionSummary>
                      <button
                        style={styles.dialogButton}
                        onClick={() =>
                          handleOpen(rubroIndex, subrubroIndex, auxiliarIndex)
                        }
                      >
                        <AddCircleOutlineIcon />
                      </button>
                    </Accordion>
                  ))}
              </Accordion>
            ))}
          </Accordion>
        ))}
      </div>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
     
      {isLoading && <LoadingModal open={true} />}
      <SpeedDial
        ariaLabel="SpeedDial basic example"
        sx={styles.speedDial(isSmallScreen, opacity)}
        icon={<AddIcon />}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SpeedDialAction
          key={"Download"}
          icon={<CloudDownloadIcon />}
          tooltipTitle={"Descargar archivo"}
          onClick={exportRubrosToExcel}
        />
        <SpeedDialAction
          key={"Upload"}
          icon={<CloudUploadIcon />}
          tooltipTitle={"Subir archivo"}
          onClick={handleSpeedDialClick}
        />
        <SpeedDialAction
          key={"Save"}
          icon={<SaveIcon />}
          tooltipTitle={"Guardar"}
          onClick={handleUpdatePresupuesto}
          disabled={isLoading}
        />
        <SpeedDialAction
          key={"Update"}
          icon={<AutorenewIcon />}
          tooltipTitle={"Actualizado Julio"}
          onClick={PresupuestoActualizado}
          disabled={isLoading}
        />
        <SpeedDialAction
          key={"Ejecutado"}
          icon={<AutoStoriesIcon  />}
          tooltipTitle={"Ejecutado"}
          onClick={PresupuestoEjecutado}
          disabled={isLoading}
        />
      </SpeedDial>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Crear centro de costos
        </DialogTitle>
        <DialogContent>
          {Array.isArray(updatedcentroCostos) &&
          updatedcentroCostos.length > 0 ? (
            <Autocomplete
              options={
                updatedcentroCostos.map((centroCosto) => ({
                  label: `${centroCosto.codigo} ${centroCosto.nombre} ${centroCosto.regional.nombre}`,
                  codigo: centroCosto.codigo,
                })) || []
              }
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) =>
                option.codigo === value.codigo
              }
              sx={{ width: 300, marginTop: 5 }}
              renderInput={(params) => (
                <TextField {...params} label="Centro Costos" />
              )}
              onChange={(event, newValue) => {
                if (newValue) {
                  setCentroCostoid(newValue.codigo);
                  setNewItem(newValue.label);
                } else {
                  console.error("Centro de costos no seleccionado");
                  setCentroCostoid(null);
                  setNewItem("");
                }
              }}
            />
          ) : (
            <Typography
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 3,
                alignItems: "center",
              }}
            >
              No Hay Centro De Costos habilitados
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAddItem}>Aceptar</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={opens}
        autoHideDuration={3000} // Duración del Snackbar
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="warning" sx={{ width: "100%" }}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CustomTable;
