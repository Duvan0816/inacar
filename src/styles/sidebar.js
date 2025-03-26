const sidebarStyles = {
  
    content: {
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', paddingBottom: 10,

    },
    icon: {
        display: 'flex', background: 'rgb(156, 211, 207, 1)', paddingTop: 10, justifyContent: 'center'
    },
    iconInmobiliaria: {
        display: 'flex', background: 'rgb(156, 211, 207, 1)', paddingTop: 10, justifyContent: 'center'
    },
    iconUA: {
        display: 'flex', background: 'rgb(156, 211, 207, 1)', paddingTop: 10, justifyContent: 'center'
    },
    iconConstructora: {
        display: 'flex', background: 'rgb(156, 211, 207, 1)', paddingTop: 10, justifyContent: 'center'
    },
    sidebar: {
        width: 200, // Ancho del sidebar de 210 px
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
            width: 200,
            boxSizing: 'border-box',
            backgroundColor: 'rgb(156, 211, 207, 1)',
        },
    },
    sidebarInmobiliaria: {
        width: 200, // Ancho del sidebar de 210 px
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
            width: 200,
            boxSizing: 'border-box',
            backgroundColor: 'rgb(156, 211, 207, 1)',
        },
    },
    sidebarUA: {
        width: 200, // Ancho del sidebar de 210 px
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
            width: 200,
            boxSizing: 'border-box',
            backgroundColor: 'rgb(156, 211, 207, 1)',
        },
    },
    sidebarConstructora: {
        width: 200, // Ancho del sidebar de 210 px
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
            width: 200,
            boxSizing: 'border-box',
            backgroundColor: 'rgb(156, 211, 207, 1)',
        },
    },
    titleItem: {
        width: '90%',
        margin: 1,
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)', // Color del ítem seleccionado #3C3C3C al 55%
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)', // Mantener el color al pasar el cursor
        },
    },
    titleItemInmobiliaria: {
        width: '90%',
        margin: 1,
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)', // Color del ítem seleccionado #3C3C3C al 55%
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)', // Mantener el color al pasar el cursor
        },
    },
    titleItemUA: {
        width: '90%',
        margin: 1,
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)', // Color del ítem seleccionado #3C3C3C al 55%
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)', // Mantener el color al pasar el cursor
        },
    },
    titleItemConstructora: {
        width: '90%',
        margin: 1,
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)', // Color del ítem seleccionado #3C3C3C al 55%
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)', // Mantener el color al pasar el cursor
        },
    },
    item: {
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)',
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)',
        },
    },
    itemInmobiliaria: {
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)',
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)',
        },
    },
    itemUA: {
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)',
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)',
        },
    },
    itemConstructora: {
        borderRadius: 3,
        color: '#555',
        '&.Mui-selected': {
            backgroundColor: 'rgba(156, 211, 207, 1)',
        },
        '&.Mui-selected:hover': {
            backgroundColor: 'rgba(156, 211, 207, 0.55)',
        },
    },
    line: {
        background: '#555', width: 1, height: '90%', margin: 12
    },
    contentlogout: {
        display: 'flex', flexDirection: 'row', margin: 15, alignItems: 'center', justifyContent: 'center'
    },
    buttonlogout: {
        display: 'flex', alignItems: 'center', flexDirection: 'column'
    }
};

export default sidebarStyles;
