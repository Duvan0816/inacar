import { useEffect, useState, useMemo } from "react";
import { getCookie } from "../../src/utils/cookieUtils";
import CustomTable from "@/components/table";
import Sidebar from "@/components/sidebar";
import withAuth from "../api/auth/withAuth";
import { openDB } from "idb";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Octe", "Nov", "Dic"];
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const csrftoken = getCookie("csrftoken");

const Constructora = () => {
  const [updatedRubros, setUpdatedRubros] = useState([]);
  const [monthlyTotals, setMonthlyTotals] = useState(Array(12).fill(0));
  const [rubrosTotals, setRubrosTotals] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [updatedCentroCostos, setCentroCostos] = useState([]);  
  const [eliminarPresupuesto, setEliminarPresupuesto] = useState(null);
  const [userId, setUserId] = useState(null);
  const [CentroCostoid, setCentroCostoid] = useState();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);
  

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
    } else {
      console.error("Token not found in localStorage.");
    }
  }, []);

  const initDB = async () => {
    const currentDB = await openDB("PresupuestoDB");
    if (currentDB.objectStoreNames.contains("rubrosData")) return currentDB;
    currentDB.close();
    return openDB("PresupuestoDB", currentDB.version + 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("rubrosData")) db.createObjectStore("rubrosData");
      },
    });
  };

  const getDataFromDB = async (store, key) => {
    try {
      const db = await initDB();
      const data = await db.get(store, key);
  
      if (data === undefined) {
        return null; 
      }
      return data;
    } catch (error) {
      return null;
    }
  };

  const saveDataToDB = async (key, data) => {
    try {
      const db = await initDB();
      await db.put("rubrosData", data, key);
    } catch (error) {
      console.error("Error saving to IndexedDB:", error);
    }
  };

  const fetchRubrosData = async () => {
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
  const fetchCentroCostosData = async () => {
    if (!token) {
      console.error("No token available for fetching CentroCostos.");
      return; 
    }
  
    const centroCostosResponse = await fetch(`${API_URL}/CentroCostos/`, {
      method: "GET",
      headers: {
        "X-CSRFToken": csrftoken,
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  
    if (!centroCostosResponse.ok) {
      const errorText = await centroCostosResponse.text();
      console.error(`Error fetching CentroCostos: ${centroCostosResponse.status} ${errorText}`);
      throw new Error(`HTTP error! Status: ${centroCostosResponse.status}`);
    }
    
    return await centroCostosResponse.json();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const savedData = await getDataFromDB("rubrosData", "constructora_rubrosData");
  
        if (savedData?.updatedRubros?.length > 0) {
          setUpdatedRubros(savedData.updatedRubros);
          setMonthlyTotals(savedData.monthlyTotals || Array(12).fill(0));
          setRubrosTotals(savedData.rubrosTotals || {});
          setInputValues(savedData.inputs || {});
          setCentroCostoid(savedData.centroCostoid || {});
          setEliminarPresupuesto(savedData.eliminarPresupuesto || {});
        } else {
          const rubrosData = await fetchRubrosData();
          setUpdatedRubros(rubrosData);
          await saveDataToDB("constructora_rubrosData", {
            updatedRubros: rubrosData,
            monthlyTotals: Array(12).fill(0),
            rubrosTotals: {},
            inputs: {},
          });
        }
  
        if (!userId) {
          const centroCostosData = await fetchCentroCostosData();
          const constructoraCentroCostos = centroCostosData.results.filter(item => item.uen.nombre === "Constructora");
          setCentroCostos(constructoraCentroCostos || []);
          setUserId(centroCostosData.user_id || null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    if (token) fetchData();
  }, [userId, token]);

  const memoizedConstructoraCentroCostos = useMemo(() => updatedCentroCostos, [updatedCentroCostos]);

  return (
    <div style={{ display: "flex", flexDirection: "row", overflow: "auto", marginRight: "10px", height: "100vh" }}>
      <Sidebar />
      <CustomTable
        eliminarPresupuesto={eliminarPresupuesto}
        setIsLoading={setIsLoading}
        isLoading={isLoading}
        initDB={initDB}
        CentroCostoid={CentroCostoid}
        setCentroCostoid={setCentroCostoid}
        updatedRubros={updatedRubros}
        setUpdatedRubros={setUpdatedRubros}
        inputValues={inputValues}
        setInputValues={setInputValues}
        rubrosTotals={rubrosTotals}
        setRubrosTotals={setRubrosTotals}
        monthlyTotals={monthlyTotals}
        setMonthlyTotals={setMonthlyTotals}
        MONTHS={MONTHS}
        userId={userId}
        updatedcentroCostos={memoizedConstructoraCentroCostos}
        uen="Constructora"
      />
    </div>
  );
};

export default withAuth(Constructora);