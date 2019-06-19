//================================================================================================================================
//se crea el modelo de datos que se utilizara para la el servicio correspondiente
//ya que es atraves de firebase, es claro que tanto en angular como en la consola 
// de firebase (especificamente en su base de datos) se debe crear las estructuras 
// de los datos
//================================================================================================================================

//================================================================
//inetrfaz, contiene las propiedades escenciales del modelo
//se usa como esqueleto para la declaracion de esquemas y clases a usar

export interface IProducto{
    id? : any;
    nombre : any
    precio : any;
    categoria : any;
}

//================================================================
//================================================================
//Clase que implementa la interfaz, ideal para instanciar objeto
//y agregar funcionalidad extra si se desea por medio de su constructor
//IMPORTANTE: no se recomienda crear metodos en esta clase
export class Producto implements IProducto {
    id : string;
    nombre : string;
    precio : number;
    categoria : string;

    constructor(){ }
}
//================================================================
//================================================================
//Clase_Utilidades que implementa la interfaz para obtener las 
//propiedades respectivas y asi agregarles utilidades como validaciones,
//html, y demas funcinalidades extra
//IMPORTANTE: en esta clase si se deberia agregar metodos y demas funcionalidades

export class Producto_Util implements IProducto {
    id = {};
    nombre = {};
    precio = {};
    categoria = {};

    constructor() {
        
    }
}

//================================================================

