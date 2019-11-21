import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";
import { Observable, observable, Subject, combineLatest, BehaviorSubject, Subscription, from } from 'rxjs';

import { IProducto, IQFiltro_Producto, Producto, Iv_PreLeer_Productos } from '../../models/firebase/productos/productos';
import { ProductosService, IProductos$, IProductoPath_Id$ } from '../../services/firebase/productos/productos.service';



@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit, OnDestroy {

  //================================================================
  //contenedor de documento para trabajo en plantilla
  public Producto:Producto; 

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  public listProductos:Producto[];

  public Productos_Path_Id:Producto | null;

  //================================================================
  //manejadores de observables y configuraciones
  // personalizadas para consultas en firestore

  private Productos$:IProductos$;
  private ProductoPath_Id$:IProductoPath_Id$;

  //================================================================
  //Campos del formulario para crear o editar documento
  public formCrearOActualizar:FormGroup; 
  //================================================================
  //
  
  //================================================================================================================================
  constructor(private _ProductosServices:ProductosService) {
    //================================================================
    //preparar la inicializacion de objetos principales
    this.Producto = new Producto();

    this.listProductos = []; 

    this.Productos$ = {
      behaviors : [],
      suscriptions : []
    };

    this.ProductoPath_Id$ = {
      behavior: null,
      suscription:null
    };

    //================================================================
    //configuracion inicial de filtrado 

    let filtroProducto:IQFiltro_Producto = this.getFiltroProductosTodo();
    this.Productos$ = this._ProductosServices.inicializarNuevaQueryDoc$(this.Productos$, filtroProducto, this.subNext_Productos, this.subError);

    //------------------------[EN TEST]------------------------
    this.ProductoPath_Id$ = this._ProductosServices.inicializarNuevaQueryDocPath_Id$(this.ProductoPath_Id$, this.subNext_ProductoPath_id, this.subError);

    //----------------------------------------------------------------

  }

  //================================================================================================================================
  //Hooks de componente angular:
  //================================================================================================================================
  ngOnInit() {   
    //================================================================
    //configurar las opciones del formulario
    let docTpl = new Producto();
    let formControls:any = <IProducto>{
      // _id: new FormControl(docTpl._id),
      nombre : new FormControl(docTpl.nombre),
      categoria : new FormControl(docTpl.categoria),
      precio : new FormControl(docTpl.precio)    
    };

    this.formCrearOActualizar = new FormGroup(formControls); 
    //================================================================
  } 

  ngOnDestroy(){
    //================================================================
    //desuscribirse de todos los observables
    
    this._ProductosServices.unsubscribePrincipales(this.Productos$, this.ProductoPath_Id$);
    //================================================================
  }

  //================================================================================================================================
  //declarar filtros (se debe usar metodo getters para poder crear
  //objetos de filtrado independientes, tomando una base como referencia)
  private getFiltroProductosTodo():IQFiltro_Producto{
    return {
      query : this._ProductosServices.queryTodosDocs,

      isPaginar:true,
      isPagReactivaFull:true,
      docInicial : null,
      limite : 4,      
      orden : <IProducto> {_id : "asc"},
    };
  } 

  private getFiltroProductosPorNombre():IQFiltro_Producto{
    return {
      query : this._ProductosServices.queryNombre,

      isPaginar:true,
      isPagReactivaFull:true,
      docInicial : null,
      limite : 4,      
      orden : <IProducto> {nombre : "asc"},
      
      //docValores:<Producto>{nombre:"ba"}
      filtroValores:{nombre:{min:"hu"}}
    };
  } 

  //================================================================
  //propiedades metodos de ejecucion next y error para las suscripciones
  private subNext_Productos = (docRes:Producto[])=>{
    let filtroDoc = this.Productos$.behaviors[this.Productos$.behaviors.length -1].getValue();
    
    this.listProductos = <Producto[]>this._ProductosServices.model_Util.preLeerDocs(docRes, this.getDatosPreLeer());   
    
    if (filtroDoc.isPagReactivaFull == false) {
         //---lo que se requiera de paginacion reactiva estandar---
    }else{
      this.Productos$ = this._ProductosServices.adminMemoriaReactivaFull(this.Productos$);
    }
  
  };

  private subNext_ProductoPath_id = (docRes:Producto)=>{
    this.Productos_Path_Id = <Producto>this._ProductosServices.model_Util.preLeerDocs(docRes, this.getDatosPreLeer());
  };

  private subError = (err:any)=>{

  };
  
  //================================================================================================================================
  //paginacion reactiva (se autogestiona de acuerdo a estandar o full):

  public paginarAnterior(){

    this.Productos$ = this._ProductosServices.paginarDocs(this.Productos$, this.listProductos, "previo");
  }

  public paginarSiguiente(){

    this.Productos$ =  this._ProductosServices.paginarDocs(this.Productos$,  this.listProductos, "siguiente", this.subNext_Productos, this.subError);
  }


  public consultarTODO(){

    let filtroProductoTodo:IQFiltro_Producto = this.getFiltroProductosTodo();
    this.Productos$ =  this._ProductosServices.inicializarNuevaQueryDoc$(this.Productos$, filtroProductoTodo, this.subNext_Productos, this.subError);
  }

  public consultarNombre(){

    let filtroProductoNombre:IQFiltro_Producto = this.getFiltroProductosPorNombre();
    this.Productos$ =  this._ProductosServices.inicializarNuevaQueryDoc$(this.Productos$, filtroProductoNombre, this.subNext_Productos, this.subError);
  }
  //================================================================================================================================
  //================================================================================================================================

  //a modo de prueba
  private getDatosPreLeer():Iv_PreLeer_Productos{
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
      this._ProductosServices.actualizarDoc(doc)
      .then((docActualizado)=>{
        console.log("987Actualizado: " + docActualizado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Actualizalo: " + error);
      });           
    } else {
      this._ProductosServices.crearDoc_set(doc)
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

  crear(){
    console.log(this.formCrearOActualizar.value);
    let d = this._ProductosServices.crearDoc_set(this.formCrearOActualizar.value);
    d.then(data=>{
      console.log("Bien987: " + data);
    })
    .catch(err=>{
      console.log(err);
    })
    
  }

  crear_set(){
    this._ProductosServices.crearDoc_set()
    .then(data=>{
      console.log("ya en el componente: " + data);
    })
    .catch(err=>{
      console.log("tratar el erro en el componente " + err);
    })
  }

  editar(){
    this._ProductosServices.actualizarDoc()
    .then(data=>{
      console.log("EDITADO ya en el componente: " + data);
    })
    .catch(err=>{
      console.log("EDITAR tratar el error en el componente " + err);
    })
  }

  eliminar(){
    this._ProductosServices.eliminarDoc()
    .then(data=>{
      console.log("borrado ya en el componente: " + data);
    })
    .catch(err=>{
      console.log("borrado tratar el error en el componente " + err);
    })
  }

}

//================================================================================================================================
