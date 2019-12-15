import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";

import { IDoc$, IDocPath_Id$, IRunFunSuscribe } from 'src/app/services/firebase/_Util';

import { IProducto, Producto } from '../../models/firebase/productos/productos';
import { ProductoService, IValQ_Producto, Iv_PreLeer_Producto } from '../../services/firebase/productos/productos.service';

import { emb_SubColeccion, Iemb_SubColeccion } from 'src/app/models/firebase/productos/emb_subColeccion';
import { IValQ_emb_SubColeccion, emb_subColeccionService } from 'src/app/services/firebase/productos/emb_subcoleccion.service';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit, OnDestroy {

  //================================================
  //contenedor de documento para trabajo en plantilla
  public Producto:Producto; 

  public ProductoCtrl$:IDoc$<Producto, IProducto<IValQ_Producto>>;
  public Producto_Path_IdCtrl$:IDocPath_Id$<Producto>;

  public Emb_SubColeccionGrupCtrl$:IDoc$<emb_SubColeccion, Iemb_SubColeccion<IValQ_emb_SubColeccion>>;

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  public productosList:Producto[];

  public Productos_Path_Id:Producto | null;

  //================================================
  //Campos del formulario para crear o editar documento
  public formCrearOActualizar:FormGroup; 
  //================================================

  //================================================================================================================================
  constructor(public _ProductoService:ProductoService,
              public _emb_SubColeccionService:emb_subColeccionService
             ) {
 
    //================================================
    //preparar la inicializacion de objetos principales
    this.Producto = new Producto();

    this.productosList = []; 
    //================================================
    //inicializacion de controls
    this.ProductoCtrl$ = null;
    this.Producto_Path_IdCtrl$ = null;
    this.Emb_SubColeccionGrupCtrl$ = null;

    //================================================
    //inicializacion de primeras consultas (opcional):

    this.ProductoCtrl$ = this._ProductoService.getProductos$(this.ProductoCtrl$, this.RFS_Productos, null);

    this.Producto_Path_IdCtrl$ = this._ProductoService.getProductos_Path_Id$(this.Producto_Path_IdCtrl$, this.RFS_Productos_Path_Id, null);
      
    //================================================

  }

  //================================================================================================================================
  //Hooks de componente angular:
  //================================================================================================================================
  ngOnInit() {   
    //================================================
    //configurar las opciones del formulario
    let docTpl = new Producto();
    let formControls:any = <IProducto<any>>{
      // _id: new FormControl(docTpl._id),
      nombre : new FormControl(docTpl.nombre),
      categoria : new FormControl(docTpl.categoria),
      precio : new FormControl(docTpl.precio)    
    };

    this.formCrearOActualizar = new FormGroup(formControls); 
    //================================================
  } 

  ngOnDestroy(){
    //================================================
    //desuscribirse de todos los observables
    this._ProductoService.unsubscribeAllProductos$([this.ProductoCtrl$], this.Producto_Path_IdCtrl$);
    //================================================
  }

  //================================================================================================================================
  //declarar filtros (se debe usar metodo getters para poder crear
  //objetos de filtrado independientes, tomando una base como referencia)
  private getFiltroProductosTodo():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      _id:{
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorNombre():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      nombre:{
        ini:"ha",
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorPrecio():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      precio:{
        //val:100 //esto si quiero igualdad
        min:300,
        _orden:"asc"
      }
    };
    return valQuery;
  } 

  private getFiltroProductosPorRuedas():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      map_miscelanea:{
        ruedas:{
          val:2,
          _orden:"asc"
        }
      }
    };
    return valQuery;
  } 

  private getFiltroProductosArrayNormal():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = null;
    return valQuery;
  } 

  private getFiltroProductosId():IProducto<IValQ_Producto>{
    let valQuery:IProducto<IValQ_Producto> = {
      _id:{
        val:"000003-ab3e840a0dff7f5d",
        _orden:"asc"
      }

    };
    return valQuery;
  } 

  //================================================================
  //propiedades metodos de ejecucion next y error para las suscripciones
  //dentro de cada una se ejecuta el codigo una vez leido los docs
  //desde la base de datos (sea poruna nueva solicitud query o por algun cambio 
  //detectado por los observables asignados)

  private RFS_Productos:IRunFunSuscribe<Producto> = {
    next:(docRes:Producto[])=>{
      this.productosList = <Producto[]>this._ProductoService.ModeloCtrl_Util.preLeerDocs(docRes, this.getDatosPreLeer());  
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Productos_Path_Id:IRunFunSuscribe<Producto> = {
    next:(docRes:Producto)=>{
      this.Productos_Path_Id = <Producto>this._ProductoService.ModeloCtrl_Util.preLeerDocs(docRes, this.getDatosPreLeer());
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Emb_SubColeccion:IRunFunSuscribe<any> = {
    next:(docRes:any[])=>{
      let test = docRes;
      let a ="";
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  
  //================================================================================================================================
  //paginacion reactiva (se autogestiona de acuerdo al tipo de paginacion):

  public paginarAnterior(){

    this.ProductoCtrl$ = this._ProductoService.paginarProductos$(this.ProductoCtrl$, "previo");
  }

  public paginarSiguiente(){

    this.ProductoCtrl$ = this._ProductoService.paginarProductos$(this.ProductoCtrl$, "siguiente");
  }

  //================================================================
  //metodos que ejecutan nuevas consultas
  //ES MEJOR USAR METODOS INDEPENDIENTES ESTO ES SOLO PRUEBA

  public consultarProducto(opc: "Todo"|"_id"|"Nombre"|"Precio"|"Ruedas"|"ArrayNormal"|"SubColGrup"){
    switch (opc) {
      case "Todo":
        this.ProductoCtrl$ = this._ProductoService.getProductos$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosTodo());
        break;
      case "_id":
        this.ProductoCtrl$ = this._ProductoService.getProductoId$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosId());
        break;        
      case "Nombre":
        this.ProductoCtrl$ = this._ProductoService.getProductosPorNombre$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosPorNombre());
        break;  
      case "Precio":
        this.ProductoCtrl$ = this._ProductoService.getProductosPorPrecio$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosPorPrecio());
        break;
      case "Ruedas":
        this.ProductoCtrl$ = this._ProductoService.getProductosPorMiscRuedas$(this.ProductoCtrl$, this.RFS_Productos, this.getFiltroProductosPorRuedas());
        break;  

      case "ArrayNormal":
        this.ProductoCtrl$ = this._ProductoService.getProductosPorArrayNormal$(this.ProductoCtrl$, this.RFS_Productos, null);    
        break;
      case "SubColGrup":
        //let path_embBase = this.productosList[10]._pathDoc; //opcion basica
        let path_embBase = null; //opcion collection group
        this.Emb_SubColeccionGrupCtrl$ = this._emb_SubColeccionService.getEmb_SubColeccions$(this.Emb_SubColeccionGrupCtrl$, this.RFS_Emb_SubColeccion, null, path_embBase );    
        break;        
    
      default:
        break;
    }
  }
  //================================================================================================================================
  //================================================================================================================================

  //a modo de prueba
  private getDatosPreLeer():Iv_PreLeer_Producto{
    return {
      imp : 20
    };
  }

  //================================================================================================================================



  public crearOActualizar(docAnterior?:Producto){

    let doc = <Producto>this.formCrearOActualizar.value;

    //================================================
    //determinar si es actualizar o crear (dependiendo 
    //si se recibe docAnterior)
    if (docAnterior) {
      this._ProductoService.actualizarProducto(doc)
      .then((docActualizado)=>{
        console.log("987Actualizado: " + docActualizado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Actualizalo: " + error);
      });           
    } else {
      this._ProductoService.crearProducto(doc)
      .then((docCreado)=>{
        console.log("987Creado: " + docCreado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Crearlo: " + error);
      });      
    }    
    //================================================




  }

  crear_set(opc: "Col"|"subCol"){
    switch (opc) {
      case "Col":
        this._ProductoService.crearProducto(<Producto>{}) //<Producto>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;

      case "subCol":
        const path_embBase = "/Productos/000010-ab42f9b7827f4749";
        this._emb_SubColeccionService.crearEmb_SubColeccion(<emb_SubColeccion>{}, path_embBase) //emb_SubColeccion>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;        
    
      default:
        break;
    }

  }

  editar(){
    this._ProductoService.actualizarProducto(<Producto>{})//<Producto>{}solo para ejemplo
    .then(()=>{
      console.log("EDITADO ya en el componente: ");
    })
    .catch(err=>{
      console.log("EDITAR tratar el error en el componente " + err);
    })
  }

  eliminar(){
    this._ProductoService.eliminarProducto("") //""solo para ejemplo
    .then(()=>{
      console.log("borrado ya en el componente: ");
    })
    .catch(err=>{
      console.log("borrado tratar el error en el componente " + err);
    })
  }

}

//================================================================================================================================
