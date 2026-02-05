// Estructura base del JSON de invitación (mismo shape que $information en el frontend)
export const defaultEventJson = {
  name: '',
  date: '',
  time: '',
  description: '',
  logo: '',
  logo1: '',
  logo2: '',
  logo3: '',
  logo4: '',
  logo5: '',
  address: '',
  design: {
    textColor: '#ffffff',
    urlColor: '#ffffff',
    accentColor: '#50c5c2',
    strokeColor: '#ffffff',

    bgMode: 'image',
    bgColor: '#000000',
    bgImage: '',
    bgScale: 1.35,
    bgX: 0,
    bgY: 0,
    bgOpacity: 1,
    bgWidth: 1280,
    bgHeight: 1600,

    textOpacity: 1,
    uppercase: true,
    fontFamily: 'inherit',

    titleY: 0,
    dateY: 0,
    timeY: 0,
    descY: 0,
    webY: 0,

    titleX: 0,
    dateX: 0,
    timeX: 0,
    descX: 0,
    webX: 0,

    shadowEnabled: false,
    shadowColor: '#000000',
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowBlur: 3,

    borderRadius: 8,
    borderWidth: 6
  }
};
