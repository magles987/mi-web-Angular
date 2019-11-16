import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";
import { Observable, observable, Subject, combineLatest, BehaviorSubject, Subscription, from } from 'rxjs';

import { IProducto, IProducto$, Producto, Producto_Util, Iv_PreLeer_Productos } from '../../models/firebase/productos/productos';
import { ProductosService } from '../../services/firebase/productos/productos.service';



@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit, OnDestroy {

  //================================================================
  //contenedor de documento para trabajo en plantilla
  public Doc:Producto; 

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  public listDocs:Producto[];

  public Docs_Path_Id:Producto | null;

  //================================================================
  //objeto de filtrado especial para observable
  //contiene los filtros iniciales de consulta
  //que se modificaran dinamicamente

  public Docs$:BehaviorSubject<IProducto$>;
  private _DocSuscription:Subscription;

  public DocsPag$:BehaviorSubject<IProducto$>[];
  private _DocsPagSuscription:Subscription[];

  public UltimoDoc$:BehaviorSubject<IProducto$>;
  private _UltimoDocSuscription:Subscription;
  
  public Doc_Path_id$:BehaviorSubject<string|null>; 
  private _Doc_Path_id_Suscription:Subscription;

  //================================================================
  //propiedades para la paginacion:

  private _isPagReactivaFull:boolean;

  public DocsIniciales:Producto[]; 
  public numPaginaActual:number;
  public limitePorPagina:number;

  //================================================================
  //Campos del formulario para crear o editar documento
  public formCrearOActualizar:FormGroup; 
  //================================================================
  //
  public model_util:Producto_Util;
  
  //================================================================================================================================
  constructor(private _ProductosServices:ProductosService) {
    //================================================================
    //preparar la inicializacion de objetos principales
    this.Doc = new Producto();

    this.listDocs = []; 

    this.DocsPag$ = [];
    this._DocsPagSuscription = [];

    this._isPagReactivaFull = true;

    this.DocsIniciales = [null]; //el item inicial DEBE SER null
    this.numPaginaActual =  0;
    this.limitePorPagina = 4;

    this.model_util = this._ProductosServices.model_Util;


    //================================================================
    //configuracion inicial de filtrado 

    // let configFiltroProductos:IProducto$ = {
    //   query : this._ProductosServices.leerDocs,

    //   docInicial : this.DocsIniciales[this.numPaginaActual],
    //   orden : <IProducto> {_id : "asc"},
    //   limite : this.limitePorPagina,
    // }; 

    let configFiltroProductos:IProducto$ = {
      query : this._ProductosServices.leerNombre,


      docInicial : this.DocsIniciales[this.numPaginaActual],
      orden : <IProducto> {_id : "asc"},
      limite : this.limitePorPagina,
      docValores:<Producto>{nombre:"ba"}
    }; 

    if (this._isPagReactivaFull) {
      this.configurarPagReactivaFull(this.numPaginaActual, configFiltroProductos);
    } else {
      this.configurarPagReactiva(configFiltroProductos);
    }

    this.UltimoDoc$= new BehaviorSubject<IProducto$>(<IProducto$>{
      query : this._ProductosServices.leerUltimoDoc
    });

    this._UltimoDocSuscription = this._ProductosServices.leerDocsFiltro(this.UltimoDoc$).subscribe({
      next:(docsRes)=>{

        if(docsRes && docsRes.length > 0){
          this._ProductosServices.ultimoIDDoc = docsRes[0]._id;
        }else{
          this._ProductosServices.ultimoIDDoc = (<Producto>{_id:this.model_util.generarIdVacio()})._id;
        }
      },
      error:(err)=>{
        this._ProductosServices.ultimoIDDoc = (<Producto>{_id:this.model_util.generarIdVacio()})._id;
      }
    });


    //------------------------[EN TEST]------------------------
    this.Doc_Path_id$ = new BehaviorSubject<string|null>(null); 
    this._Doc_Path_id_Suscription = this._ProductosServices.leerDocPorPathId(this.Doc_Path_id$).subscribe({
      next:(docRes)=>{
        if(docRes){
          this.Docs_Path_Id = <Producto>this.model_util.preLeerDocs(docRes, this.getDatosPreLeer());
        }else{
          this.Docs_Path_Id = null;
        }
      },
      error:(err)=>{}
    });    

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
    
    if (this._isPagReactivaFull == false) {
      this._DocSuscription.unsubscribe();
    } else {
      for (let i = 0; i < this._DocsPagSuscription.length; i++) {
        this._DocsPagSuscription[i].unsubscribe();        
      }
    }
    this._UltimoDocSuscription.unsubscribe();
    this._Doc_Path_id_Suscription.unsubscribe();
    //================================================================
  }
  //================================================================================================================================  
  //================================================================================================================================
  //paginacion reactiva basica:

  public paginarAnterior(){
    if(this._isPagReactivaFull == false){
      //================================================================
      //determinar si es posible cargar una nueva pagina
      if (this.listDocs.length > 0 && this.numPaginaActual > 0) {
      //================================================================
      //se recupera el filtro inicial del BehaviorSubject para tomarlo como base,
      //luego se configura el idInicial con el que se va a solicitar la anterior pagina
        const configFiltro = this.Docs$.getValue();
        this.numPaginaActual--;
        configFiltro.docInicial= this.DocsIniciales[this.numPaginaActual];

        //se solicita por medio de next(), ya que no se requiere crear nuevos observadores  
        this.Docs$.next(configFiltro);      
      }
    }
  }

  public paginarSiguiente(){
    //determina que tipo de paginacion se esta usando
    if(this._isPagReactivaFull == false){
      //================================================================
      //determinar si es posible cargar una nueva pagina
      if (this.listDocs.length == this.limitePorPagina) {
      //================================================================
      //se recupera el filtro inicial del BehaviorSubject para tomarlo como base,
      // luego se configura el idInicial con el que se va a solicitar la siguiente pagina
        let configFiltro = this.Docs$.getValue();
        this.numPaginaActual++;
        configFiltro.docInicial= this.DocsIniciales[this.numPaginaActual];

        //se solicita por medio de next(), ya que no se requiere crear nuevos observadores
        this.Docs$.next(configFiltro);      
      }
      
    }
  }

  private configurarPagReactiva(configFiltro:IProducto$){
    //================================================================
    //se define el Observable especial:
    this.Docs$ = new BehaviorSubject<IProducto$>(configFiltro);
    //================================================================
    
    this._DocSuscription =  this._ProductosServices.leerDocsFiltro(this.Docs$).subscribe({
      next:(docsRes)=>{

        if(docsRes && docsRes.length > 0){

          this.listDocs = <Producto[]>this.model_util.preLeerDocs(docsRes, this.getDatosPreLeer());
          this.DocsIniciales[this.numPaginaActual + 1] = this.listDocs[this.listDocs.length - 1];
        
        }else{
          this.listDocs = [];
        }
      },
      error:(err)=>{

      }
    });
  }
  
  private reiniciarPagReactiva(){

    this.DocsIniciales = [new Producto()];
    this.numPaginaActual = 0;
    this.listDocs = [];

  }

  //================================================================================================================================
  //Paginacion reactiva FULL

  public paginarSiguienteFull(){
    //determina que tipo de paginacion se esta usando
    if(this._isPagReactivaFull == true){   
      //================================================================
      //determinar si es posible cargar un nuevo lote (pagina) de documentos
      //analisando si el ultimo lote (pagina) no esta vacio y si tienen 
      //la misma cantidad de elementos que el limite predefinido por pagina
      //
      let limiteLote = ((this.numPaginaActual + 1) * this.limitePorPagina);
      if(this.listDocs.length == limiteLote ){
        
        //================================================================
        //se recupera el valor del filtro que actualmente tiene el BehaviorSubject
        //correspontiente a este lote (pagina), para poder preparar la nueva 
        //solilicitud de paginacion
        let configFiltro = this.DocsPag$[this.numPaginaActual].getValue();
        this.numPaginaActual++;
        configFiltro.docInicial = this.DocsIniciales[this.numPaginaActual];
        //================================================================
        //se crea un nuevo observador para poder analizar los cambios de 
        //este nuevo lote (pagina), por ahora no es necesario el uso de next()
        //ya que cada solicitud de cargar nuevo lote (pagina) obliga a crear 
        //un nuevo observador
        this.configurarPagReactivaFull(this.numPaginaActual, configFiltro);
        
      }
      //================================================================
    }      

  }

  private configurarPagReactivaFull(idxPag:number, configFiltro:IProducto$){

    //================================================================
    //se define el Observable especial:
    this.DocsPag$[idxPag]= new BehaviorSubject<IProducto$>(configFiltro);
    //================================================================
    

    this._DocsPagSuscription[idxPag] = this._ProductosServices.leerDocsFiltro(this.DocsPag$[idxPag]).subscribe({
        next:(docsRes)=>{
    
          let iniIdxSeccion = idxPag * this.limitePorPagina;
          let finIdxSeccion = (idxPag + 1) * this.limitePorPagina;

          let iniListDocsParcial:Producto[] = [];
          let finListDocsParcial:Producto[] = [];
          
          if (this.listDocs.length >= iniIdxSeccion) {
            iniListDocsParcial = this.listDocs.slice(0, iniIdxSeccion);
          }
          if (this.listDocs.length >= finIdxSeccion) {
            finListDocsParcial = this.listDocs.slice(finIdxSeccion);
          }              
      
          
          let lsD = iniListDocsParcial.concat(docsRes).concat(finListDocsParcial);
          if (lsD.length > 0) {
            this.listDocs = <Producto[]>this.model_util.eliminarItemsDuplicadosArray(lsD, this.model_util._id.nom);

            if (docsRes.length > 0) {
              this.DocsIniciales[idxPag + 1] = docsRes[docsRes.length -1];
            }

            //================================================================
            //determinar borrado de documento y liberar memoria de los
            //observables que no se usan
            let pagRealEntero = (this.listDocs.length / this.limitePorPagina) + 1;
            let pagActualEntero = this.numPaginaActual + 1; 
            if (pagActualEntero >= pagRealEntero) {
              let diferencialExcesoMemoria = Math.floor(pagActualEntero/pagRealEntero) ;
              for (let i = 0; i < diferencialExcesoMemoria; i++) {
                //================================================================
                //liberar memoria de obserbables no usados
                this._DocsPagSuscription[this._DocsPagSuscription.length -1].unsubscribe();
                this._DocsPagSuscription.pop();
                this.DocsPag$.pop();
                this.DocsIniciales.pop();
                this.numPaginaActual--;                
                //================================================================
                
              }
            }            
            //================================================================

          } else {
            this.listDocs = [];
          }
                  
        },
        error:(err)=>{
          console.log(err);
        }
    });
  }

  private reiniciarPagReactivaFull(){
    if (this._DocsPagSuscription && this.DocsPag$) {
      for (let i = 0; i < this._DocsPagSuscription.length; i++) {
        this._DocsPagSuscription[i].unsubscribe();        
      }
      this.DocsPag$ = [];      
    }
    this.DocsIniciales = [new Producto()];
    this.numPaginaActual = 0;
    this.listDocs = [];

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
