import Sidebar from "@/components/sidebar";
import CardStorage from "@/components/cardStorage";
import { useEffect, useState } from "react";
import { getCookie } from "../../src/utils/cookieUtils";
import { useRouter } from "next/router";
import withAuth from "../api/auth/withAuth";
import { openDB } from "idb";
import LoadingModal from "@/components/loading";

const Storage = () => {
  const [updatedRubros, setUpdatedRubros] = useState([]); 
  const [updatedPresupuestos, setPresupuestos] = useState([]);
  const [userId, setUserId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  let dbInstance = null;

  const initDB = async () => {
    if (dbInstance) return dbInstance;
    indexedDB.deleteDatabase("PresupuestoDB");

    dbInstance = await openDB("PresupuestoDB", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("rubrosData")) {
          db.createObjectStore("rubrosData");
        }
      },
    });

    return dbInstance;
  };

  const clearDataInDB = async (currentView) => {
    try {
      const db = await initDB();
      const tx = db.transaction("rubrosData", "readwrite");
      const store = tx.objectStore("rubrosData");
      await store.put(
        {
          updatedRubros: [],
          monthlyTotals: Array(12).fill(0),
          rubrosTotals: {},
          inputs: {},
        },
        `${currentView}_rubrosData`
      );
      await tx.done;
    } catch (error) {
      console.error("Error al vaciar datos en IndexedDB:", error);
    }
  };

  const saveDataToDB = async (key, data) => {
    const db = await initDB();
    if (!db) {
      console.error("IndexedDB no está disponible");
      return;
    }
    try {
      const tx = db.transaction("rubrosData", "readwrite");
      const store = tx.objectStore("rubrosData");
      await store.put(data, key);
      await tx.done;
    } catch (error) {
      console.error("Error al guardar datos en IndexedDB:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const csrftoken = getCookie("csrftoken");
        const token = localStorage.getItem("token");
        let allData = [];
        let page = 1;
        let totalPages = 1;
        do {
          const presupuestosResponse = await fetch(
            `${API_URL}/HistorialPresupuestoActualizado/?page=${page}`,
            {
              method: "GET",
              headers: {
                "X-CSRFToken": csrftoken,
                Authorization: `Token ${token}`,
                "Content-Type": "application/json",
              },
              credentials: "include",
              keepalive: true 
            }
          );
    
          if (!presupuestosResponse.ok) {
            const errorText = await presupuestosResponse.text();
            console.error("Error Response Text:", errorText);
            throw new Error(`HTTP error! Status: ${presupuestosResponse.status}`);
          }
    
          const data = await presupuestosResponse.json();
          allData = [...allData, ...data.results]; // Concatenate new data
          totalPages = Math.ceil(data.count / 1000); // Update total pages
          page++; // Move to the next page
        } while (page <= totalPages);
    
        const transformedData = allData.map((item) => ({
          id: item.id,
          usuario: item.usuario,
          uen: item.uen,
          centroCostoid: item.cuenta,
          rubro: item.rubro,
          subrubro: item.subrubro,
          auxiliar: item.auxiliar,
          item: item.item,
          meses_presupuesto: item.meses_presupuesto,
          fecha: item.fecha,
          rubrosTotals: item.rubrosTotals,
          updatedRubros: item.updatedRubros,
          monthlyTotals: item.monthlyTotals,
        }));
        setPresupuestos(transformedData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!userId) {
      fetchData();
    }
  }, [userId]);
  
  const uniquePresupuestos = Array.from(
    new Map(
      updatedPresupuestos.map((presupuesto) => {
        const year = new Date(presupuesto.fecha).getFullYear();
        const uniqueKey = `${presupuesto.uen.nombre}-${presupuesto.usuario.id}-${year}`;
        return [uniqueKey, presupuesto];
      })
    ).values()
  );

  const handleCardClick = async (nombre, usuarioId, fecha) => {
    const targetYear = new Date(fecha).getFullYear();
    const filteredPresupuestos = updatedPresupuestos.filter((item) => {
      const itemYear = new Date(item.fecha).getFullYear();
      return (
        item.uen.nombre.toLowerCase() === nombre.toLowerCase() &&
        item.usuario.id === usuarioId &&
        itemYear === targetYear 
      );
    });

    if (filteredPresupuestos.length > 0) {
      const newInputValues = {};
      let newMonthlyTotals = [];
      const newRubrosTotals = {};
      const updatedRubrosCopy = filteredPresupuestos[0].updatedRubros || [];

      filteredPresupuestos.forEach((entry) => {
        const { id, centroCostoid, rubro, subrubro, auxiliar, item, meses_presupuesto } = entry;
        
        if (meses_presupuesto && Array.isArray(meses_presupuesto)) {
          meses_presupuesto.forEach(({ meses, presupuestomes }) => {
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
            
            // Verificar si meses es un índice válido (0 a 11)
            if (typeof meses === "number" && meses >= 0 && meses < 12) {
              newMonthlyTotals[meses] += value;
            }

            const rubroNombre = updatedRubrosCopy[rubro].nombre
            if (rubroNombre) {
              if (!newRubrosTotals[rubroNombre]) {
                newRubrosTotals[rubroNombre] = Array(12).fill(0); 
              }
              if (!newRubrosTotals[rubroNombre][meses]) {
                newRubrosTotals[rubroNombre][meses] = 0;
              }
              newRubrosTotals[rubroNombre][meses] += value;
            }
          });
        }
      });
    
      const currentView = nombre === "Unidades de Apoyo" ? "unidad-apoyo" : nombre.toLowerCase();
    
      await clearDataInDB(currentView);
    
      await saveDataToDB(`${currentView}_rubrosData`, {
        inputs: newInputValues,
        centroCostoid: filteredPresupuestos.map((entry) => entry.centroCostoid),
        updatedRubros: filteredPresupuestos[filteredPresupuestos.length - 1].updatedRubros,
        rubrosTotals: newRubrosTotals,
        monthlyTotals: newMonthlyTotals,
      });

      router.push(`/uen/${currentView}`);
    }
  };
  
  return (
    <>
      {isLoading && <LoadingModal open={isLoading} />}
      <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
        <Sidebar />
        <div style={{ display: "flex", flexDirection: "column", width: "80%" }}>
          {uniquePresupuestos.length > 0 &&
            uniquePresupuestos.map((presupuesto, index) => (
              <CardStorage
                key={index}
                area={`${presupuesto.uen.nombre || "N/A"}`}
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
            ))}
        </div>
      </div>
    </>
  );
};

export default withAuth(Storage);
