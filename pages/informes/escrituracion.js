import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Accordion, AccordionSummary, AccordionDetails, Typography, Autocomplete,
  TextField, DialogTitle, DialogContent, Dialog, DialogActions, Button, Tooltip,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getCookie } from "@/utils/cookieUtils";
import Sidebar from "@/components/sidebar";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { Box } from "@mui/material";

const TableEscrituracion = () => {
  const anioActual = 2025;
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const [open, setOpen] = useState(false);
  const [centroCostos, setCentroCostos] = useState([]);
  const [selectedCentroCosto, setSelectedCentroCosto] = useState(null);
  const [rows, setRows] = useState([]);
  const [tipoParametro, setTipoParametro] = useState("PROYECTADO");

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setSelectedCentroCosto(null);
  };

  // Obtener centros de costos (solo Promotora)
  useEffect(() => {
    const fetchCentroCostos = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const csrftoken = getCookie("csrftoken");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/CentroCostos/`, {
        method: "GET",
        headers: {
          "X-CSRFToken": csrftoken,
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error cargando centro costos");
      const data = await response.json();
      const Promotora = data.results.filter(c => c.uen.nombre === "Promotora");
      setCentroCostos(Promotora);
    };
    fetchCentroCostos();
  }, []);

  // Cargar escrituración guardada
  useEffect(() => {
    const fetchEscrituracionData = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const csrftoken = getCookie("csrftoken");
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/escrituracionList/?parametro=${tipoParametro}&anio=${anioActual}`, {
        method: "GET",
        headers: {
          "X-CSRFToken": csrftoken,
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error cargando escrituración");
      const data = await response.json();
      const newRows = [];

      data.results.forEach(item => {
        const label = `${item.centro_costo.codigo} ${item.centro_costo.nombre} ${item.centro_costo.regional.nombre}`;
        const existing = newRows.find(row => row.centroDeCosto === label);
        if (existing) {
          existing.unid[item.mes - 1] = item.unidades;
          existing.val[item.mes - 1] = parseFloat(item.valor);
        } else {
          const unid = Array(12).fill(0);
          const val = Array(12).fill(0);
          unid[item.mes - 1] = item.unidades;
          val[item.mes - 1] = parseFloat(item.valor);
          newRows.push({ centroDeCosto: label, unid, val });
        }
      });

      setRows(newRows);
    };

    if (centroCostos.length > 0) fetchEscrituracionData();
  }, [tipoParametro, centroCostos]);

  const addRow = () => {
    if (selectedCentroCosto) {
      const label = selectedCentroCosto.label;
      setRows(prev => ([...prev, { centroDeCosto: label, unid: Array(12).fill(0), val: Array(12).fill(0) }]));
      handleClose();
    }
  };

  const handleInputChange = (rowIndex, monthIndex, type, value) => {
    const newRows = [...rows];
    newRows[rowIndex][type][monthIndex] = Number(value) || 0;
    setRows(newRows);
  };

  const removeRow = async (rowIndex) => {
    const confirmDelete = window.confirm("¿Seguro que deseas eliminar este centro de costo?");
    if (!confirmDelete) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const csrftoken = getCookie("csrftoken");
    const token = localStorage.getItem("token");

    const row = rows[rowIndex];
    const centroCostoCodigo = row.centroDeCosto.split(" ")[0];
    const centro = centroCostos.find(c => String(c.codigo) === centroCostoCodigo);

    if (!centro) {
      alert("Centro de costo no encontrado.");
      return;
    }

    try {
      const url = `${API_URL}/escrituracionList/delete-escrituracion/?centro_costo_id=${centro.id}&anio=${anioActual}&parametro=${tipoParametro}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": csrftoken,
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        alert("Eliminado correctamente.");
        setRows(prev => prev.filter((_, i) => i !== rowIndex));  // actualiza frontend
      } else {
        const errorData = await response.json();
        console.error("Error al eliminar:", errorData);
        alert("No se pudo eliminar.");
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert("Fallo conexión al servidor.");
    }
  };

  const calculateRowTotals = (row) => ({
    unid: row.unid.reduce((a, b) => a + b, 0),
    val: row.val.reduce((a, b) => a + b, 0),
  });

  const exportToExcel = () => {
    const headers = ["Centro de costo", ...meses.flatMap(m => [`Unid ${m}`, `Val ${m}`]), "Total Unid", "Total Val"];
    const data = rows.map(row => {
      const totals = calculateRowTotals(row);
      return [row.centroDeCosto, ...row.unid.flatMap((u, i) => [u, row.val[i]]), totals.unid, totals.val];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Escrituracion_${anioActual}`);
    XLSX.writeFile(wb, `Escrituracion_${anioActual}.xlsx`);
  };

  const handleSave = async () => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const csrftoken = getCookie("csrftoken");
    const token = localStorage.getItem("token");
    let payload = [];

    rows.forEach(row => {
      const codigo = row.centroDeCosto.split(" ")[0];
      const centro = centroCostos.find(c => String(c.codigo) === codigo);
      if (!centro) return;
      for (let i = 0; i < 12; i++) {
        payload.push({
          centro_costo_id: centro.id,
          anio: anioActual,
          mes: i + 1,
          unidades: row.unid[i],
          valor: row.val[i],
          parametro: tipoParametro,
        });
      }
    });

    try {
      const response = await fetch(`${API_URL}/escrituracionList/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": csrftoken,
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      });
      if (response.ok) alert("Datos guardados correctamente.");
      else alert("Error al guardar datos.");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Fallo la conexión con el servidor.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
      <Sidebar />
      <div style={{ flexGrow: 1, padding: "20px", overflow: "auto" }}>

        <Typography variant="h4" sx={{ mb: 2, mt: 3, fontWeight: 600, color: "#333" }}>
          📊 Informe de Escrituración {anioActual}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
          <Button
            variant={tipoParametro === "PROYECTADO" ? "contained" : "outlined"}
            startIcon={<AssessmentIcon />}
            onClick={() => setTipoParametro("PROYECTADO")}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              backgroundColor: tipoParametro === "PROYECTADO" ? "#003366" : "transparent",
              color: tipoParametro === "PROYECTADO" ? "#fff" : "#003366",
              border: "1px solid #003366",
              '&:hover': {
                backgroundColor: tipoParametro === "PROYECTADO" ? "#002244" : "#e6f0ff",
              },
            }}
          >
            Proyectado
          </Button>

          <Button
            variant={tipoParametro === "EJECUTADO" ? "contained" : "outlined"}
            startIcon={<CheckCircleOutlineIcon />}
            onClick={() => setTipoParametro("EJECUTADO")}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              backgroundColor: tipoParametro === "EJECUTADO" ? "#003366" : "transparent",
              color: tipoParametro === "EJECUTADO" ? "#fff" : "#003366",
              border: "1px solid #003366",
              '&:hover': {
                backgroundColor: tipoParametro === "EJECUTADO" ? "#002244" : "#e6f0ff",
              },
            }}
          >
            Ejecutado
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ borderRadius: 2, fontWeight: 600 }}
          >
            Guardar {tipoParametro}
          </Button>
        </Box>
        
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            style={{ background: "#fd8002", color: "white" }}
          >
            <Typography variant="h6">Año {anioActual}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      rowSpan={2}
                      style={{ position: "sticky", left: 0, background: "#f5f5f5", zIndex: 2, fontWeight: "bold", textAlign: "center" }}
                    >
                      PROYECTOS
                    </TableCell>
                    {meses.map((mes, i) => (
                      <TableCell
                        key={i}
                        colSpan={2}
                        style={{ background: "#e0e0e0", textAlign: "center", fontWeight: "bold" }}
                      >
                        {mes}
                      </TableCell>
                    ))}
                    <TableCell rowSpan={2} style={{ fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>
                      Total UND
                    </TableCell>
                    <TableCell rowSpan={2} style={{ fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>
                      Total VALOR
                    </TableCell>
                    <TableCell rowSpan={2} style={{ fontWeight: "bold", textAlign: "center", background: "#f5f5f5" }}>
                      Eliminar
                    </TableCell>
                  </TableRow>

                  {/* SEGUNDA FILA: UND y VALOR por cada mes */}
                  <TableRow>
                    {meses.map((_, index) => (
                      <React.Fragment key={index}>
                        <TableCell style={{ textAlign: "center", fontWeight: "bold" }}>UND</TableCell>
                        <TableCell style={{ textAlign: "center", fontWeight: "bold" }}>VALOR</TableCell>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row, rowIndex) => {
                    const totals = calculateRowTotals(row);
                    return (
                      <TableRow key={rowIndex} hover>
                        <TableCell style={{ position: "sticky", left: 0, background: "#fff", zIndex: 1 }}>
                          {row.centroDeCosto}
                        </TableCell>
                        {meses.map((_, monthIndex) => (
                          <React.Fragment key={monthIndex}>
                            <TableCell>
                              <input
                                type="number"
                                style={{ width: "60px" }}
                                value={row.unid[monthIndex]}
                                onChange={e => handleInputChange(rowIndex, monthIndex, "unid", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <input
                                type="number"
                                style={{ width: "80px" }}
                                value={row.val[monthIndex]}
                                onChange={e => handleInputChange(rowIndex, monthIndex, "val", e.target.value)}
                              />
                            </TableCell>
                          </React.Fragment>
                        ))}
                        <TableCell>{totals.unid}</TableCell>
                        <TableCell>{totals.val}</TableCell>
                        <TableCell align="center">
                          <DeleteOutlineIcon
                            style={{ cursor: "pointer", color: "red" }}
                            onClick={() => removeRow(rowIndex)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
              <Tooltip title="Agregar Proyecto" arrow>
                <Button
                  onClick={handleClickOpen}
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                  style={{ background: "white", color: "black", border: "1px solid black", boxShadow: "0px 0px 10px rgba(0,0,0,0.25)" }}
                >
                  <AddCircleOutlineIcon /> 
                </Button>
              </Tooltip>
              <Tooltip title="Exportar a Excel" arrow>
                <Button
                  variant="contained"
                  color="success"
                  sx={{ borderRadius: 2, fontWeight: 600 }}
                  onClick={exportToExcel}
                >
                  <FileDownloadOutlinedIcon />
                </Button>
              </Tooltip>
            </div>
          </AccordionDetails>
        </Accordion>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>Selecciona un proyecto</DialogTitle>
          <DialogContent>
            <Autocomplete
              options={centroCostos.map(c => ({ label: `${c.codigo} ${c.nombre} ${c.regional.nombre}`, codigo: c.codigo }))}
              value={selectedCentroCosto}
              onChange={(e, newValue) => setSelectedCentroCosto(newValue)}
              renderInput={params => <TextField {...params} label="Centro de costo" fullWidth />}
              style={{ marginTop: "20px" }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button onClick={addRow} variant="contained" color="primary">Agregar</Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default TableEscrituracion;