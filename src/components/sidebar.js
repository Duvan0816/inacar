import { useEffect } from 'react';
import Image from 'next/image';
import SidebarStyle from '../styles/sidebar';
import React, { useState } from 'react';
import InacarLogo from '../../public/logo-INACAR.png';
import { Drawer, List, ListItem, ListItemText, ListItemIcon, Collapse, Toolbar, Typography, Avatar, Button } from '@mui/material';
import { ExpandLess, ExpandMore, Home as HomeIcon, Description as DescriptionIcon, BarChart as BarChartIcon, AllInbox } from '@mui/icons-material';
import AvatarUser from './avatarUser';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const [openUEN, setOpenUEN] = useState(false);
  const [openInformes, setOpenInformes] = useState(false);
  const [openConsolidado, setOpenConsolidado] = useState(false);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [user, setUser] = useState('');

  const router = useRouter();


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const first_name = localStorage.getItem('first_name');
      const last_name = localStorage.getItem('last_name');
      setUser(first_name + ' ' + last_name || 'Usuario');
    }
  }, []);

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

  const handleHistorialClick = () => {
    setOpenHistorial(!openHistorial);
    setSelectedItem('Historial');
  };

  const handleItemClick = (item, path) => {
    setSelectedItem(item);
    // window.location.href = path;
    router.push(path);
  };

  const deleteDatabase = async () => {
    const dbName = "PresupuestoDB";
    const tableName = "rubrosData"; // Nombre de la tabla específica
  
    // Paso 1: Abre la base de datos
    const request = indexedDB.open(dbName);
  
    request.onsuccess = (event) => {
      const db = event.target.result;
  
      // Paso 2: Elimina el contenido de la tabla específica
      const transaction = db.transaction([tableName], "readwrite");
      const objectStore = transaction.objectStore(tableName);
  
      const clearRequest = objectStore.clear();
      clearRequest.onsuccess = () => {
        console.log(`Tabla ${tableName} vaciada con éxito.`);
      };
  
      clearRequest.onerror = (event) => {
        console.error(`Error al vaciar la tabla ${tableName}:`, event);
      };
  
      // Paso 3: Cierra la conexión
      transaction.oncomplete = () => {
        db.close();
  
        // Paso 4: Elimina toda la base de datos
        const deleteRequest = indexedDB.deleteDatabase(dbName);
  
        deleteRequest.onsuccess = () => {
          console.log(`Base de datos ${dbName} eliminada exitosamente.`);
        };
  
        deleteRequest.onerror = (event) => {
          console.error(`Error al eliminar la base de datos ${dbName}:`, event);
        };
  
        deleteRequest.onblocked = () => {
          console.warn(`La base de datos ${dbName} está bloqueada y no se puede eliminar.`);
        };
      };
    };
  
    request.onerror = (event) => {
      console.error(`Error al abrir la base de datos ${dbName}:`, event);
    };
  };
  

  const handleLogout = async () => {
    try {

      await deleteDatabase(); // Call the function to delete all data

      // Clear localStorage
      localStorage.clear();
      router.push('/login');
      console.log("Cierre de sesión completado correctamente.");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  useEffect(() => {
  }, [router.pathname]);

  return (
    <Drawer variant="permanent" sx={router.pathname === "/uen/constructora" ? SidebarStyle.sidebarConstructora : router.pathname === "/uen/inmobiliaria" ? SidebarStyle.sidebarInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.sidebarUA : SidebarStyle.sidebar} >
      <div style={SidebarStyle.content}>
        <div>
          <div sx={router.pathname === "/uen/constructora" ? SidebarStyle.iconConstructora : router.pathname === "/uen/inmobiliaria" ? SidebarStyle.iconInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.iconUA : SidebarStyle.icon}>
            <Toolbar>
              <Typography variant="h6" noWrap style={{ cursor: 'pointer' }} onClick={() => handleItemClick('Inicio', '/inicio')}>
                <Image src={InacarLogo} alt="Logo" height={50} width={100} priority />
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
              <ListItemIcon sx={{ color: '#FFFFFF' }}>
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
              <ListItemIcon sx={{ color: '#FFFFFF' }}>
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
                    <ListItemText primary="Detallado" />
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
             
                  <ListItem button selected={selectedItem === 'Preventas'} onClick={() => handleItemClick('preventas', '/informes/preventas')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Preventas" />
                  </ListItem>
                  <ListItem button selected={selectedItem === 'Escrituracion'} onClick={() => handleItemClick('escrituracion', '/informes/escrituracion')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.item : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.itemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.itemUA : SidebarStyle.item}>
                    <ListItemText primary="Escrituracion" />
                  </ListItem>
                </div>
              </List>
            </Collapse>

            <ListItem button selected={selectedItem === 'Gráficas'} onClick={() => handleItemClick('Gráficas', '/graficas')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.titleItemUA : SidebarStyle.titleItem}>
              <ListItemIcon sx={{ color: '#FFFFFF' }}>
                <BarChartIcon />
              </ListItemIcon>
              <ListItemText primary="Gráficas" />
            </ListItem>
            {/* <ListItem button selected={selectedItem === 'Historial'} onClick={() => handleItemClick('Historial', '/historial')} sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : router.pathname === "/uen/unidad-apoyo" ? SidebarStyle.titleItemUA : SidebarStyle.titleItem}>
              <ListItemIcon sx={{ color: '#FFFFFF' }}>
                <AllInbox />
              </ListItemIcon>
              <ListItemText primary="Historial" />
            </ListItem> */}
            <ListItem
              button
              onClick={handleHistorialClick}
              selected={selectedItem === 'Historial'}
              sx={router.pathname === "/uen/constructora" ? SidebarStyle.titleItemConstructora : router.pathname === '/uen/inmobiliaria' ? SidebarStyle.titleItemInmobiliaria : SidebarStyle.titleItem}
            >
              <ListItemIcon sx={{ color: '#FFFFFF' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={SidebarStyle.contentlogout}>
            <AvatarUser nombre={user} />
            <Typography sx={{ marginLeft: 1 }} color='#fff'>{user}</Typography>
          </div>
          <div style={SidebarStyle.buttonlogout}>
            <Button
              variant="text"
              startIcon={<LogoutIcon color='white' />}
              sx={{ color: 'white' }}
              onClick={() => handleLogout()}
            />
          </div>
        </div>
      </div >
    </Drawer >
  );
};

export default Sidebar;
