import Sidebar from "@/components/sidebar";
import { useEffect, useState, useMemo, lazy } from "react";
import { getCookie } from "../../src/utils/cookieUtils";
import { useRouter } from "next/router";
import withAuth from "../api/auth/withAuth";
import { openDB } from "idb";
import { Modal, CircularProgress, Skeleton } from "@mui/material";
import { motion } from "framer-motion";
import CardStorage from "@/components/cardStorage";
import pako from "pako";

const LoadingModal = ({ open, message }) => (
  <Modal open={open} sx={{ zIndex: 2000 }}>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 2000,
      }}
    >
      <div
        style={{
          padding: "30px",
          background: "#fff",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px",
          border: "2px solid #000",
        }}
      >
        <CircularProgress color="primary" />
        <p style={{ fontSize: "18px", fontWeight: "500", fontStyle: "italic" }}>
          {message || "Cargando..."}
        </p>
      </div>
    </div>
  </Modal>
);

const decompressUpdatedRubros = (encodedStr) => {
  try {
    const binaryStr = atob(encodedStr);
    const binaryData = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
    const decompressed = pako.inflate(binaryData, { to: "string" });
    return JSON.parse(decompressed);
  } catch (e) {
    console.error("Error descomprimiendo updatedRubros:", e);
    return null;
  }
};

const Storage = () => {
  const [updatedPresupuestos, setPresupuestos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [db, setDb] = useState(null);

  useEffect(() => {
    openDB("PresupuestoDB", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("rubrosData")) {
          db.createObjectStore("rubrosData");
        }
      },
    }).then(setDb);
  }, []);

  const saveDataToDB = async (key, data) => {
    if (!db) return;
    const tx = db.transaction("rubrosData", "readwrite");
    const store = tx.objectStore("rubrosData");
    await store.put(data, key);
    await tx.done;
  };

  useEffect(() => {
    const fetchAllPages = async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const csrftoken = getCookie("csrftoken");
      const token = localStorage.getItem("token");
      const headers = {
        "X-CSRFToken": csrftoken,
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      };

      const getPage = async (page) => {
        const res = await fetch(`${API_URL}/HistorialPresupuestoActualizado/?page=${page}`, {
          method: "GET",
          headers,
          credentials: "include",
          keepalive: true,
        });
        return res.json();
      };

      try {
        const firstPage = await getPage(1);
        const totalPages = Math.ceil(firstPage.count / 2000);
        let allData = [...firstPage.results];

        if (totalPages > 1) {
          const pageNumbers = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
          const responses = await Promise.allSettled(
            pageNumbers.map((page) => getPage(page))
          );

          responses.forEach((res) => {
            if (res.status === "fulfilled") {
              allData = allData.concat(res.value.results);
            }
          });
        }
        console.log(allData)
        setPresupuestos(allData);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllPages();
  }, []);

  const uniquePresupuestos = useMemo(() => {
    return Array.from(
      new Map(
        updatedPresupuestos.map((p) => {
          const year = new Date(p.fecha).getFullYear();
          const uniqueKey = `${p.uen.nombre}-${p.usuario.id}-${year}`;
          return [uniqueKey, p];
        })
      ).values()
    );
  }, [updatedPresupuestos]);

  const handleCardClick = async (nombre, usuarioId, fecha) => {
    const targetYear = new Date(fecha).getFullYear();
    const filtered = updatedPresupuestos.filter((item) => {
      const itemYear = new Date(item.fecha).getFullYear();
      return (
        item.uen.nombre.toLowerCase() === nombre.toLowerCase() &&
        item.usuario.id === usuarioId &&
        itemYear === targetYear
      );
    });

    if (filtered.length > 0) {
      const newInputValues = {};
      let newMonthlyTotals = [];
      const newRubrosTotals = {};
      const encodedUpdatedRubros = filtered[0].updatedRubros;
      const updatedRubrosCopy = decompressUpdatedRubros(encodedUpdatedRubros);

      filtered.forEach((entry) => {
        const { id, centroCostoid, rubro, subrubro, auxiliar, item, meses_presupuesto } = entry;
        meses_presupuesto?.forEach(({ meses, presupuestomes }) => {
          const inputId = `outlined-basic-${rubro}-${subrubro}-${auxiliar}-${item}-${meses}`;
          newInputValues[inputId] = {
            centroCostoid,
            id,
            rubro,
            subrubro,
            auxiliar,
            item,
            meses,
            value: parseFloat(presupuestomes),
          };

          const value = parseFloat(newInputValues[inputId]?.value) || 0;

          if (!Array.isArray(newMonthlyTotals) || newMonthlyTotals.length === 0) {
            newMonthlyTotals = Array(12).fill(0);
          }

          if (typeof meses === "number" && meses >= 0 && meses < 12) {
            newMonthlyTotals[meses] += value;
          }

          const rubroNombre = updatedRubrosCopy[rubro]?.nombre;
          if (rubroNombre) {
            if (!newRubrosTotals[rubroNombre]) {
              newRubrosTotals[rubroNombre] = Array(12).fill(0);
            }
            newRubrosTotals[rubroNombre][meses] += value;
          }
        });
      });

      const currentView = nombre === "Unidades de Apoyo" ? "unidad-apoyo" : nombre.toLowerCase();
      const eliminarPresupuesto = "presupuestosActualizado";

      await saveDataToDB(`${currentView}_rubrosData`, {
        inputs: newInputValues,
        centroCostoid: filtered.map((entry) => entry.centroCostoid),
        updatedRubros: updatedRubrosCopy,
        rubrosTotals: newRubrosTotals,
        monthlyTotals: newMonthlyTotals,
        eliminarPresupuesto,
      });

      router.push(`/uen/${currentView}`);
    }
  };

  return (
    <>
      {isLoading && <LoadingModal open={isLoading} message="Cargando historial..." />}
      <div style={{ display: "flex", flexDirection: "row", minHeight: "100vh" }}>
        <div style={{ width: "250px", flexShrink: 0 }}>
          <Sidebar />
        </div>
        <div style={{ flex: 1, padding: "20px", gap: "15px", display: "flex", flexDirection: "column" }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton
                key={idx}
                variant="rectangular"
                width="100%"
                height={120}
                sx={{ bgcolor: "rgba(0,0,0,0.15)", borderRadius: "12px" }}
              />
            ))
          ) : (
            uniquePresupuestos.map((presupuesto, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
              >
                <CardStorage
                  area={presupuesto.uen.nombre || "N/A"}
                  user={`${presupuesto.usuario.first_name} ${presupuesto.usuario.last_name}`}
                  date={`${new Date(presupuesto.fecha).getFullYear() || "N/A"}`}
                  click={() =>
                    handleCardClick(
                      presupuesto.uen.nombre,
                      presupuesto.usuario.id,
                      presupuesto.fecha
                    )
                  }
                />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default withAuth(Storage);