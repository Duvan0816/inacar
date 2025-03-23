import Sidebar from "@/components/sidebar";
import { useEffect, useState, useMemo, lazy, Suspense } from "react";
import { getCookie } from "../../src/utils/cookieUtils";
import { useRouter } from "next/router";
import withAuth from "../api/auth/withAuth";
import { openDB } from "idb";
import { Modal, CircularProgress, Skeleton } from "@mui/material";
import { motion } from "framer-motion";

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

const CardStorage = lazy(() => import("@/components/cardStorage"));

const Storage = () => {
  const [updatedPresupuestos, setPresupuestos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [db, setDb] = useState(null);

  useEffect(() => {
    const setupDB = async () => {
      const dbInstance = await openDB("PresupuestoDB", 2, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("rubrosData")) {
            db.createObjectStore("rubrosData");
          }
        },
      });
      setDb(dbInstance);
    };
    setupDB();
  }, []);

  const saveDataToDB = async (key, data) => {
    if (!db) return;
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
    const fetchAllPages = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const csrftoken = getCookie("csrftoken");
        const token = localStorage.getItem("token");

        const firstPageResponse = await fetch(`${API_URL}/HistorialPresupuestoEjecutado/?page=1`, {
          method: "GET",
          headers: {
            "X-CSRFToken": csrftoken,
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          keepalive: true,
        });

        if (!firstPageResponse.ok) throw new Error("Error al cargar la página 1");
        const firstPageData = await firstPageResponse.json();
        const totalPages = Math.ceil(firstPageData.count / 1000);
        let allData = [...firstPageData.results];

        if (totalPages > 1) {
          const pagePromises = [];
          for (let i = 2; i <= totalPages; i++) {
            pagePromises.push(
              fetch(`${API_URL}/HistorialPresupuestoEjecutado/?page=${i}`, {
                method: "GET",
                headers: {
                  "X-CSRFToken": csrftoken,
                  Authorization: `Token ${token}`,
                  "Content-Type": "application/json",
                },
                credentials: "include",
                keepalive: true,
              }).then((res) => res.json())
            );
          }
          const pages = await Promise.all(pagePromises);
          pages.forEach((page) => {
            allData = [...allData, ...page.results];
          });
        }

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
          updatedRubros: item.updatedRubros,
        }));

        setPresupuestos(transformedData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPages();
  }, []);

  const uniquePresupuestos = useMemo(() => {
    return Array.from(
      new Map(
        updatedPresupuestos.map((presupuesto) => {
          const year = new Date(presupuesto.fecha).getFullYear();
          const uniqueKey = `${presupuesto.uen.nombre}-${presupuesto.usuario.id}-${year}`;
          return [uniqueKey, presupuesto];
        })
      ).values()
    );
  }, [updatedPresupuestos]);

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
        }
      });

      const currentView = nombre === "Unidades de Apoyo" ? "unidad-apoyo" : nombre.toLowerCase();
      const eliminarPresupuesto = "presupuestoEjecutado";

      await saveDataToDB(`${currentView}_rubrosData`, {
        inputs: newInputValues,
        centroCostoid: filteredPresupuestos.map((entry) => entry.centroCostoid),
        updatedRubros: filteredPresupuestos[filteredPresupuestos.length - 1].updatedRubros,
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
// import Sidebar from "@/components/sidebar";
// import CardStorage from "@/components/cardStorage";
// import { useEffect, useState } from "react";
// import { getCookie } from "../../src/utils/cookieUtils";
// import { useRouter } from "next/router";
// import withAuth from "../api/auth/withAuth";
// import { openDB } from "idb";
// import LoadingModal from "@/components/loading";

// const Storage = () => {
//   const [updatedRubros, setUpdatedRubros] = useState([]); 
//   const [updatedPresupuestos, setPresupuestos] = useState([]);
//   const [userId, setUserId] = useState(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [isLoading, setIsLoading] = useState(true);
//   const router = useRouter();
//   let dbInstance = null;

//   const initDB = async () => {
//     if (dbInstance) return dbInstance;
//     indexedDB.deleteDatabase("PresupuestoDB");

//     dbInstance = await openDB("PresupuestoDB", 1, {
//       upgrade(db) {
//         if (!db.objectStoreNames.contains("rubrosData")) {
//           db.createObjectStore("rubrosData");
//         }
//       },
//     });

//     return dbInstance;
//   };

//   const clearDataInDB = async (currentView) => {
//     try {
//       const db = await initDB();
//       const tx = db.transaction("rubrosData", "readwrite");
//       const store = tx.objectStore("rubrosData");
//       await store.put(
//         {
//           updatedRubros: [],
//           monthlyTotals: Array(12).fill(0),
//           rubrosTotals: {},
//           inputs: {},
//         },
//         `${currentView}_rubrosData`
//       );
//       await tx.done;
//     } catch (error) {
//       console.error("Error al vaciar datos en IndexedDB:", error);
//     }
//   };

//   const saveDataToDB = async (key, data) => {
//     const db = await initDB();
//     if (!db) {
//       console.error("IndexedDB no está disponible");
//       return;
//     }
//     try {
//       const tx = db.transaction("rubrosData", "readwrite");
//       const store = tx.objectStore("rubrosData");
//       await store.put(data, key);
//       await tx.done;
//     } catch (error) {
//       console.error("Error al guardar datos en IndexedDB:", error);
//     }
//   };

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const API_URL =
//           process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
//         const csrftoken = getCookie("csrftoken");
//         const token = localStorage.getItem("token");
//         let allData = [];
//         let page = 1;
//         let totalPages = 1;
//         do {
//           const presupuestosResponse = await fetch(
//             `${API_URL}/HistorialPresupuestoEjecutado/?page=${page}`,
//             {
//               method: "GET",
//               headers: {
//                 "X-CSRFToken": csrftoken,
//                 Authorization: `Token ${token}`,
//                 "Content-Type": "application/json",
//               },
//               credentials: "include",
//               keepalive: true 
//             }
//           );
    
//           if (!presupuestosResponse.ok) {
//             const errorText = await presupuestosResponse.text();
//             console.error("Error Response Text:", errorText);
//             throw new Error(`HTTP error! Status: ${presupuestosResponse.status}`);
//           }
    
//           const data = await presupuestosResponse.json();
//           allData = [...allData, ...data.results]; // Concatenate new data
//           totalPages = Math.ceil(data.count / 1000); // Update total pages
//           page++; // Move to the next page
//         } while (page <= totalPages);
    
//         const transformedData = allData.map((item) => ({
//           id: item.id,
//           usuario: item.usuario,
//           uen: item.uen,
//           centroCostoid: item.cuenta,
//           rubro: item.rubro,
//           subrubro: item.subrubro,
//           auxiliar: item.auxiliar,
//           item: item.item,
//           meses_presupuesto: item.meses_presupuesto,
//           fecha: item.fecha,
//           rubrosTotals: item.rubrosTotals,
//           updatedRubros: item.updatedRubros,
//           monthlyTotals: item.monthlyTotals,
//         }));
//         setPresupuestos(transformedData || []);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     if (!userId) {
//       fetchData();
//     }
//   }, [userId]);
  
//   const uniquePresupuestos = Array.from(
//     new Map(
//       updatedPresupuestos.map((presupuesto) => {
//         const year = new Date(presupuesto.fecha).getFullYear();
//         const uniqueKey = `${presupuesto.uen.nombre}-${presupuesto.usuario.id}-${year}`;
//         return [uniqueKey, presupuesto];
//       })
//     ).values()
//   );

//   const handleCardClick = async (nombre, usuarioId, fecha) => {
//     const targetYear = new Date(fecha).getFullYear();
//     const filteredPresupuestos = updatedPresupuestos.filter((item) => {
//       const itemYear = new Date(item.fecha).getFullYear();
//       return (
//         item.uen.nombre.toLowerCase() === nombre.toLowerCase() &&
//         item.usuario.id === usuarioId &&
//         itemYear === targetYear 
//       );
//     });

//     if (filteredPresupuestos.length > 0) {
//       const newInputValues = {};
//       let newMonthlyTotals = [];
//       const newRubrosTotals = {};
//       const updatedRubrosCopy = filteredPresupuestos[0].updatedRubros || [];

//       filteredPresupuestos.forEach((entry) => {
//         const { id, centroCostoid, rubro, subrubro, auxiliar, item, meses_presupuesto } = entry;
        
//         if (meses_presupuesto && Array.isArray(meses_presupuesto)) {
//           meses_presupuesto.forEach(({ meses, presupuestomes }) => {
//             const inputId = `outlined-basic-${rubro}-${subrubro}-${auxiliar}-${item}-${meses}`;
            
//             newInputValues[inputId] = {
//               centroCostoid,
//               id,
//               rubro,
//               subrubro,
//               auxiliar,
//               item,
//               meses,
//               value: parseFloat(presupuestomes),
//             };
    
//             const value = parseFloat(newInputValues[inputId]?.value) || 0;
            
//             if (!Array.isArray(newMonthlyTotals) || newMonthlyTotals.length === 0) {
//               newMonthlyTotals = Array(12).fill(0);
//             }
            
//             // Verificar si meses es un índice válido (0 a 11)
//             if (typeof meses === "number" && meses >= 0 && meses < 12) {
//               newMonthlyTotals[meses] += value;
//             }

//             const rubroNombre = updatedRubrosCopy[rubro].nombre
//             if (rubroNombre) {
//               if (!newRubrosTotals[rubroNombre]) {
//                 newRubrosTotals[rubroNombre] = Array(12).fill(0); 
//               }
//               if (!newRubrosTotals[rubroNombre][meses]) {
//                 newRubrosTotals[rubroNombre][meses] = 0;
//               }
//               newRubrosTotals[rubroNombre][meses] += value;
//             }
//           });
//         }
//       });
    
//       const currentView = nombre === "Unidades de Apoyo" ? "unidad-apoyo" : nombre.toLowerCase();
//       const eliminarPresupuesto = "presupuestoEjecutado"

//       await clearDataInDB(currentView);
//       await saveDataToDB(`${currentView}_rubrosData`, {
//         inputs: newInputValues,
//         centroCostoid: filteredPresupuestos.map((entry) => entry.centroCostoid),
//         updatedRubros: filteredPresupuestos[filteredPresupuestos.length - 1].updatedRubros,
//         rubrosTotals: newRubrosTotals,
//         monthlyTotals: newMonthlyTotals,
//         eliminarPresupuesto: eliminarPresupuesto,
//       });

//       router.push(`/uen/${currentView}`);
//     }
//   };
  
//   return (
//     <>
//       {isLoading && <LoadingModal open={isLoading} />}
//       <div style={{ display: "flex", flexDirection: "row", height: "100vh" }}>
//         <Sidebar />
//         <div style={{ display: "flex", flexDirection: "column", width: "80%" }}>
//           {uniquePresupuestos.length > 0 &&
//             uniquePresupuestos.map((presupuesto, index) => (
//               <CardStorage
//                 key={index}
//                 area={`${presupuesto.uen.nombre || "N/A"}`}
//                 user={`${presupuesto.usuario.first_name} ${presupuesto.usuario.last_name}`}
//                 date={`${new Date(presupuesto.fecha).getFullYear() || "N/A"}`}
//                 click={() =>
//                   handleCardClick(
//                     presupuesto.uen.nombre,
//                     presupuesto.usuario.id,
//                     presupuesto.fecha
//                   )
//                 }
//               />
//             ))}
//         </div>
//       </div>
//     </>
//   );
// };

// export default withAuth(Storage);
