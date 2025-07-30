import { useEffect } from 'react';
import Image from 'next/image';
import SidebarStyle from '../styles/sidebar';
import React, { useState } from 'react';
import inacarNV from '../../public/realista2.png';
import { Drawer, List, ListItem, ListItemText, ListItemIcon, Collapse, Toolbar, Typography, Button } from '@mui/material';
import { ExpandLess, ExpandMore, Home as HomeIcon, Description as DescriptionIcon, BarChart as BarChartIcon, BusinessCenter as BusinessCenterIcon } from '@mui/icons-material';
import AvatarUser from './avatarUser';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const [openUEN, setOpenUEN] = useState(false);
  const [openInformes, setOpenInformes] = useState(false);
  const [openConsolidado, setOpenConsolidado] = useState(false);
  const [openGrafica, setOpenGrafica] = useState(false);
  const [openProyecto, setOpenProyecto] = useState(false);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [user, setUser] = useState('');
  const router = useRouter();

  const handleUENClick = () => {
    setOpenUEN(!openUEN);
    setSelectedItem('UEN');
  };

  const handleInformesClick = () => {
    setOpenInformes(!openInformes);
    setSelectedItem('Informes');
  };
  const handleConsolidadoClick = () => {
    setOpenConsolidado(!openConsolidado);
    setSelectedItem('Consolidado');
  };
  const handleGraficaClick = () => {
    setOpenGrafica(!openGrafica);
    setSelectedItem('Grafica');
  };
  const handleProyectoClick = () => {
    setOpenProyecto(!openProyecto);
    setSelectedItem('Proyecto');
  };

  const handleHistorialClick = () => {
    setOpenHistorial(!openHistorial);
    setSelectedItem('Historial');
  };

  // Estado del usuario
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const first_name = localStorage.getItem('first_name') || '';
      const last_name = localStorage.getItem('last_name') || '';
      setUser(`${first_name} ${last_name}`.trim() || 'Usuario');
    }
  }, []);

  // Navegación entre secciones
  const handleItemClick = (item, path) => {
    setSelectedItem(item);
    router.push(path);
  };

  // Función para eliminar la base de datos en IndexedDB
  const deleteDatabase = async () => {
    const dbName = "PresupuestoDB";
    const tableName = "rubrosData";

    const request = indexedDB.open(dbName);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([tableName], "readwrite");
      const objectStore = transaction.objectStore(tableName);

      // Elimina la tabla específica
      const clearRequest = objectStore.clear();
      clearRequest.onsuccess = () => console.log(`Tabla ${tableName} vaciada con éxito.`);
      clearRequest.onerror = (event) => console.error(`Error al vaciar la tabla ${tableName}:`, event);

      // Una vez terminada la transacción, eliminar la base de datos
      transaction.oncomplete = () => {
        db.close();
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => console.log(`Base de datos ${dbName} eliminada exitosamente.`);
        deleteRequest.onerror = (event) => console.error(`Error al eliminar la base de datos ${dbName}:`, event);
        deleteRequest.onblocked = () => console.warn(`La base de datos ${dbName} está bloqueada y no se puede eliminar.`);
      };
    };

    request.onerror = (event) => console.error(`Error al abrir la base de datos ${dbName}:`, event);
  };

  // Cierre de sesión con eliminación de IndexedDB y localStorage
  const handleLogout = async () => {
    try {
      await deleteDatabase();
      localStorage.clear();
      router.push('/login');
      console.log("Cierre de sesión completado correctamente.");
    } catch (error) {
      console.error("Error durante el logout:", error);
    }
  };

  // Efecto para detectar cambios en la ruta
  useEffect(() => {}, [router.pathname]);

  return (
    <Drawer variant="permanent" sx={router.pathname === "/uen/constructora" ? SidebarStyle.sidebarConstructora : router.pathname === "/uen/inmobiliaria" ? SidebarStyle.sidebarInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.sidebarUA : SidebarStyle.sidebar} >
      <div style={SidebarStyle.content}>
        <div>
          <div sx={router.pathname === "/uen/constructora" ? SidebarStyle.iconConstructora : router.pathname === "/uen/inmobiliaria" ? SidebarStyle.iconInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.iconUA : SidebarStyle.icon}>
            <Toolbar>
              <Typography variant="h6" noWrap style={{ cursor: 'pointer' }} onClick={() => handleItemClick('Inicio', '/inicio')}>
                <Image src={inacarNV} alt="Logo" height={125} width={140} priority />
              </Typography>
            </Toolbar>
          </div>
          <List>
            <ListItem
              button
              onClick={handleUENClick}
              selected={selectedItem === 'UEN'}
              sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.titleItemUA : SidebarStyle.titleItem}
            >
              <ListItemIcon sx={{ color: '#555' }}>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="UEN" />
              {openUEN ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={openUEN} timeout="auto" unmountOnExit>
              <List component="div" disablePadding style={{ display: 'flex', flexDirection: 'row' }}>
                <div>
                  <div style={SidebarStyle.line} />
                </div>
                <div>
                  <ListItem button selected={selectedItem === 'Constructora'} onClick={() => handleItemClick('Constructora', '/uen/constructora')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Constructora" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Inmobiliaria'} onClick={() => handleItemClick('Inmobiliaria', '/uen/inmobiliaria')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Inmobiliaria" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Promotora'} onClick={() => handleItemClick('Promotora', '/uen/promotora')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Promotora" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Unidad De Apoyo'} onClick={() => handleItemClick('Unidad De Apoyo', '/uen/unidad-apoyo')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Unidad de Apoyo" />
                  </ListItem>
                </div>
              </List>
            </Collapse>

            <ListItem
              button
              onClick={handleInformesClick}
              selected={selectedItem === 'Informes'}
              sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : SidebarStyle.titleItem}
            >
              <ListItemIcon sx={{ color: '#555' }}>
                <DescriptionIcon />
              </ListItemIcon>
              <ListItemText primary="Informes" />
              {openInformes ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={openInformes} timeout="auto" unmountOnExit>
              <List component="div" disablePadding style={{ display: 'flex', flexDirection: 'row' }}>
                <div>
                  <div style={SidebarStyle.line}></div>
                </div>
                <div>
                  <ListItem button selected={selectedItem === 'Detallado'} onClick={() => handleItemClick('Detallado', '/informes/detallado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Inicial" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Actualizado'} onClick={() => handleItemClick('Actualizado', '/informes/actualizado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Actualizado" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Ejecutado'} onClick={() => handleItemClick('Ejecutado', '/informes/ejecutado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Ejecutado" />
                  </ListItem>

                  <ListItem
                    button
                    onClick={handleConsolidadoClick}
                    selected={selectedItem === 'Consolidado'}
                    sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : SidebarStyle.titleItem}
                  >
                    <ListItemText primary="Consolidado" />
                    {openConsolidado ? <ExpandLess /> : <ExpandMore />}

                  </ListItem>
              
                  <div>
                    <Collapse in={openConsolidado} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding style={{ display: 'flex', flexDirection: 'column',marginLeft: 20 }}>
                        <ListItem button selected={selectedItem === 'ActualizadoC'} onClick={() => handleItemClick('Actualizadoc', '/informes/consolidado/actualizado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                          <ListItemText primary="Actualizado" />
                        </ListItem>
                        <ListItem button selected={selectedItem === 'Ejecutadoc'} onClick={() => handleItemClick('Ejecutadoc', '/informes/consolidado/ejecutado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                          <ListItemText primary="Ejecutado" />
                        </ListItem>
                      </List>
                    </Collapse>
                  </div>
                </div>
              </List>
            </Collapse>

            <ListItem
              button
              onClick={handleGraficaClick}
              selected={selectedItem === 'Gráficas'}
              sx={router.pathname === "/graficas" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : SidebarStyle.titleItem}
            >
              <ListItemIcon sx={{ color: '#555' }}>
                <BarChartIcon />
              </ListItemIcon>
              <ListItemText primary="Gráficas" />
              {openGrafica ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={openGrafica} timeout="auto" unmountOnExit>
              <List component="div" disablePadding style={{ display: 'flex', flexDirection: 'row' }}>
                <div>
                  <div style={SidebarStyle.line}></div>
                </div>
                <div>
                  <ListItem button selected={selectedItem === 'ActualizadoI'} onClick={() => handleItemClick('ActualizadoI', '/graficas/actualizado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Actualizado" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'EjecutadoP'} onClick={() => handleItemClick('EjecutadoP', '/graficas/ejecutado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Ejecutado" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'EscrituracionL'} onClick={() => handleItemClick('EscrituracionL', '/graficas/escrituracion')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Escrituración" />
                  </ListItem>
                </div>
              </List>
            </Collapse>
              <ListItem
              button
              onClick={handleProyectoClick}
              selected={selectedItem === 'Proyectos'}
              sx={router.pathname === "/Proyectos" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : SidebarStyle.titleItem}
            >
              <ListItemIcon sx={{ color: '#555' }}>
                <BusinessCenterIcon />
              </ListItemIcon>
              <ListItemText primary="Proyectos" />
              {openProyecto ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={openProyecto} timeout="auto" unmountOnExit>
              <List component="div" disablePadding style={{ display: 'flex', flexDirection: 'row' }}>
                <div>
                  <div style={SidebarStyle.line}></div>
                </div>
                <div>
                  <ListItem button selected={selectedItem === 'Escrituracion'} onClick={() => handleItemClick('Escrituracion', '/informes/escrituracion')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Escrituración" />
                  </ListItem>
                  {/* <ListItem button selected={selectedItem === 'PreVentas'} onClick={() => handleItemClick('PreVentas', '/informes/ejecutado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="PreVentas" />
                  </ListItem> */}
                </div>
              </List>
            </Collapse>
            <ListItem
              button
              onClick={handleHistorialClick}
              selected={selectedItem === 'Historial'}
              sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : SidebarStyle.titleItem}
            >
              <ListItemIcon sx={{ color: '#555' }}>
                <DescriptionIcon />
              </ListItemIcon>
              <ListItemText primary="Historial" />
              {openHistorial ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={openHistorial} timeout="auto" unmountOnExit>
              <List component="div" disablePadding style={{ display: 'flex', flexDirection: 'row' }}>
                <div>
                  <div style={SidebarStyle.line}></div>
                </div>
                <div>
                  <ListItem button selected={selectedItem === 'Inicial'} onClick={() => handleItemClick('Inicial', '/historial/inicial')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Inicial" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Actualizado'} onClick={() => handleItemClick('Actualizado', '/historial/actualizado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Actualizado" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'EjecutadoH'} onClick={() => handleItemClick('EjecutadoH', '/historial/ejecutado')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Ejecutado" />
                  </ListItem>

                </div>
              </List>
            </Collapse>
          </List>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', padding: '20px' }}>
          <AvatarUser nombre={user} />
          <Typography sx={{ marginTop: 1, color: '#555' }}>{user}</Typography>
          <Button 
            variant="contained" 
            startIcon={<LogoutIcon />} 
            sx={{ marginTop: 1, color: '#555', fontSize: '0.75rem', padding: '5px 10px' }} 
            onClick={handleLogout}
          >
            Cerrar Sesión
          </Button>
        </div>
      </div >
    </Drawer >
  );
};

export default Sidebar;