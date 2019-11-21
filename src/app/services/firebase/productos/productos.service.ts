//================================================================================================================================
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
// desde firebase, en otras palabras hace las veces de controller para angular

//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, from, fromEvent, of, Subscription, interval, timer, combineLatest } from 'rxjs';
import { map, switchMap, mergeAll, concatAll, concatMap, mergeMap, mapTo, toArray, concat } from 'rxjs/operators';

import { IProducto, IQFiltro_Producto, Producto, Producto_Util, Iv_PreModificar_Productos  } from '../../../models/firebase/productos/productos';


@Injectable({
  providedIn: 'root'
})
export class ProductosService {

  //================================================================

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  private _listDocsReactiveFull:Producto[];

  //================================================================
  //objeto de filtrado especial para observable
  //contiene los filtros iniciales de consulta
  //que se modificaran dinamicamente

  private _UltimoDoc$:BehaviorSubject<IQFiltro_Producto>;
  private _UltimoDocSuscription:Subscription;

  //================================================================
  //propiedades para la paginacion:

  private snapshotDocsIniciales:any[]; 
  private numPaginaActual:number;
  private limitePaginaPredefinido:number;

  public model_Util:Producto_Util;
  private _pathColeccion:string ;

  private ultimoIDDoc:string;


  constructor(private _afs:AngularFirestore) {

    //================================================================
    //cargar la configuracion de la coleccion
    this.limitePaginaPredefinido = 4;

    this.model_Util = new Producto_Util();
    //----------------[EN CONSTRUCCION]----------------
    this._pathColeccion = this.model_Util.getPathColeccion("");    
    //------------------------------------------------
    //================================================================
    //configurar lectura de ultimo Documento para obtener id
    this._UltimoDoc$ = new BehaviorSubject<IQFiltro_Producto>({
      query: this._queryUltimoDocParaID,
      isPaginar:false,
      isPagReactivaFull:false,
      docInicial:null
    });
    this._UltimoDocSuscription = this.configurarBehaviorRes(this._UltimoDoc$).subscribe((docsRes)=>{
      this.ultimoIDDoc = docsRes.length? docsRes[docsRes.length -1]._id : this.model_Util.generarIdVacio();
    })
    //================================================================
   }

  //================================================================================================================================
  //================================================================================================================================
  //Metodos CRUD:
  //================================================================================================================================
  //================================================================================================================================
  //Metodos de Lectura:
  //la librearia de @angular/Fire hace uso de observables para leer datos ademas
  //se manejan 2 formas diferentes de leer los datos de la BD
  //
  //1. Colecciones: cuando se lee un grupo (array) de documentos de una misma coleccion
  //de acuerdo a algun tipo de consulta o parametro de filtrado.
  //IMPORTANTE: cuando se lee a traves de colecciones el  PATH usado en  this._afs.collection(PATH, .....)
  //siempre debe apuntar a una COLECCION SIEMPRE, no a un documento, esta libreria comprueba rudimentariamente
  //que apunta a una coleccion cuando el  PATH  tiene un numero de ubicaciones   IMPAR  
  //   "ubicacion1(coleccion)/ubicacion2(documento)/ubicacion3(subColeccion)/......."
  //
  //2. Documento:  cuando se lee 1 y solo 1 documento, normalmente consulta por id  a 
  //traves de   path   de firestore  que es de la forma  "/coleccion/{_id del doc}"
   //IMPORTANTE: cuando se lee a traves de documentos el  PATH usado en    this._afs.doc<....>(filtroPath_id)
  //siempre debe apuntar a un DOCUMENTO SIEMPRE, no a una coleccion; esta libreria comprueba rudimentariamente
  //que apunta a un docuemnto cuando el  PATH  tiene un numero de ubicaciones   PAR 
  //   "ubicacion1(coleccion)/ubicacion2(documento)/ubicacion3(subColeccion)/ubicacion4(documento)......."
 
  //================================================================================================================================
  //declaracion de querys para cada consulta requerida
  
  public queryTodosDocs = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtroDoc:IQFiltro_Producto)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
    cursorQueryRef = cursorQueryRef.orderBy(this.model_Util._id.nom, filtroDoc.orden._id || "asc");
    if (filtroDoc.docInicial && filtroDoc.docInicial != null) {
      cursorQueryRef = cursorQueryRef.startAfter(filtroDoc.docInicial);//
    } else {
      cursorQueryRef = cursorQueryRef.startAfter(null);//
    }
    
    cursorQueryRef = cursorQueryRef.limit(filtroDoc.limite || this.limitePaginaPredefinido);  //   
    return cursorQueryRef;  
  };   

  public queryID = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtroDoc:IQFiltro_Producto)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
    cursorQueryRef = cursorQueryRef.where(this.model_Util._id.nom, "==", filtroDoc.docValores._id);
    return cursorQueryRef;
  }; 


  

  public queryNombre = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtroDoc:IQFiltro_Producto)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

    if (filtroDoc.docValores && filtroDoc.docValores.nombre) {
      cursorQueryRef = cursorQueryRef.where(this.model_Util.nombre.nom, "==", filtroDoc.docValores.nombre);
    }

    if(filtroDoc.filtroValores.nombre){
      filtroDoc.filtroValores.nombre.max = this.model_Util.getLlaveFinBusquedaStrFirestore(filtroDoc.filtroValores.nombre.min);

      cursorQueryRef = cursorQueryRef.where(this.model_Util.nombre.nom, ">=", filtroDoc.filtroValores.nombre.min)
                       .where(this.model_Util.nombre.nom, "<", filtroDoc.filtroValores.nombre.max);    
    }

    cursorQueryRef = cursorQueryRef.orderBy(this.model_Util.nombre.nom, filtroDoc.orden.nombre || "asc");
    cursorQueryRef = cursorQueryRef.limit(filtroDoc.limite || this.limitePaginaPredefinido);  //  
    if (filtroDoc.docInicial && filtroDoc.docInicial != null) {
      cursorQueryRef = cursorQueryRef.startAfter(filtroDoc.docInicial);// filtro.docInicial.nombre, filtro.docInicial._id 
    } else {
      cursorQueryRef = cursorQueryRef.startAfter(null);//
    }
    
    return cursorQueryRef;  
  }; 

  //consulta especial para obtener el ultimo doc para su ID
  private _queryUltimoDocParaID = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtroDoc:IQFiltro_Producto)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
    cursorQueryRef = cursorQueryRef.orderBy(this.model_Util._id.nom, "desc");
    cursorQueryRef = cursorQueryRef.limit(1); //se determina que SOLO DEBO LEER EL ULTIMO
    return cursorQueryRef;  
  }; 

  //================================================================================================================================
  //================================================================
  // metodo de lectura principal con opcion de filtros dinamicos
  //Parametros:
  //BSubject$ -> es un BehaviorSubject<IQFiltro_>  (subjet especial que permite enviar parametros iniciales 
  //           antes de la  primera subscripcion al observador), esta tipado con la interfaz 
  //           especial   IQFiltro_[modelo]  (donde   IQFiltro_[modelo]  es el modelo de filtrado para las querys)la cual implementa en un solo objeto 
  //           todos los campos especiales para el filtrado con el fin de que. 
  //           Este   filtro$   es declarado en la respectiva   clase.component.ts  donde se requiera subscribirse  

  private configurarBehaviorRes(BSubject$:BehaviorSubject<IQFiltro_Producto>):Observable<Producto[]>{
    //el pipe y el switchMap permiten trabajar con   BehaviorSubject<IQFiltro_>
    //de forma dinamica asi que solo usando llamadas   BSubject$.next({objeto con filtros}) 
    return BSubject$
          .pipe(switchMap((filtroDoc)=>{ 

            let idxPag = this.numPaginaActual; //solo se usa en paginacion reactiva full

            //================================================================
            //configuracion inicial para la lectura de docs en OPCION COLECCION
            //se debe garantizar que  getPathColeccion()   devuelva un path para 
            //coleccion o sub coleccion.
            //el callback   (ref)=>{}   permite la creacion del cursor de consulta  
            //e implementar los filtros
            
            return this._afs.collection(this._pathColeccion, (ref)=>filtroDoc.query(ref, filtroDoc))
                  .snapshotChanges()  //devuelve docs y metadata
                  .pipe(
                    map(actions => {
                      let docsLeidos = actions.map(a => {
                        const data = a.payload.doc.data() as Producto;
                        const _id = a.payload.doc.id;
                        return { _id, ...data };
                      });                     
                      //================================================================
                      //Aqui realizar el codigo a ejecutar antes de entregar los docs
                      //y que requiera operaciones adicionales a nivel de array 
                      //como sumatorias agrupaciones y demas
                      //sin embargo esto se deberia hacer con la libreria de rxJs

                      //================================================================
                      if (filtroDoc.isPaginar) {
  
                        if (filtroDoc.isPagReactivaFull == false) {
                          if (docsLeidos.length > 0) {
                            this.snapshotDocsIniciales[this.numPaginaActual + 1] = actions[actions.length -1].payload.doc;   
                          }
                          docsLeidos = this.configurarPagReactiva(docsLeidos, filtroDoc);
                        } else {
                          if (docsLeidos.length > 0) {
                            this.snapshotDocsIniciales[idxPag + 1] = actions[actions.length -1].payload.doc;   
                          }
                          docsLeidos = this.configurarPagReactivaFull(docsLeidos, idxPag, filtroDoc);
                        }                             
                      }
                      return docsLeidos;
                    })                
                  );
            //================================================================                         
          }))
  }

  //================================================================
  //================================================================
  // lectura de un solo documento por  path_id
  leerDocPorPathId(filtroPathDoc_id$:BehaviorSubject<string>):Observable<Producto>{

    return filtroPathDoc_id$
    .pipe(switchMap(filtroPathDoc_id=>{

      if (filtroPathDoc_id && filtroPathDoc_id != "") {

        const doc_afs = <AngularFirestoreDocument<Producto>> this._afs.doc<Producto>(filtroPathDoc_id);
        return doc_afs.valueChanges();     
      } else {
        //---falta probar y reparar--------
        return of(null);
      }

    }))
  }
  //================================================================

  // crearDoc_add(docNuevo:Producto | any){
  //   return this._productosCollection.add(producto);
  // }  

  public pruebaIndexCrear = 0;
  crearDoc_set(docNuevo?:Producto):Promise<Producto>{

    //--------------------------------------------------
    let loteNuevos = <Producto[]>[
      {
        _id:"",
        nombre:"prueba12",
        categoria: "prueba12",
        precio: 400,
        map_miscelanea:{
          tipo:"vehiculo",
          ruedas: 4
        },
        mapA_misc:[
          {color: "cafe"},
          {color: "verde"},
          {color: "amarillo"}
        ],
        v_precioImpuesto : 120
      },
      {
        _id:"",
        nombre:"prueba13",
        categoria: "prueba13",
        precio: 400,
        map_miscelanea:{
          tipo:"vehiculo",
          ruedas: 4
        },
        mapA_misc:[
          {color: "cafe"},
          {color: "verde"},
          {color: "amarillo"}
        ],
        v_precioImpuesto : 120
      },
      {
        _id:"",
        nombre:"prueba14",
        categoria: "prueba14",
        precio: 400,
        map_miscelanea:{
          tipo:"vehiculo",
          ruedas: 4
        },
        mapA_misc:[
          {color: "cafe"},
          {color: "verde"},
          {color: "amarillo"}
        ],
        v_precioImpuesto : 120
      },
      {
        _id:"",
        nombre:"prueba15",
        categoria: "prueba15",
        precio: 400,
        map_miscelanea:{
          tipo:"vehiculo",
          ruedas: 4
        },
        mapA_misc:[
          {color: "cafe"},
          {color: "verde"},
          {color: "amarillo"}
        ],
        v_precioImpuesto : 120
      },
      {
        _id:"",
        nombre:"prueba16",
        categoria: "prueba16",
        precio: 400,
        map_miscelanea:{
          tipo:"vehiculo",
          ruedas: 4
        },
        mapA_misc:[
          {color: "cafe"},
          {color: "verde"},
          {color: "amarillo"}
        ],
        v_precioImpuesto : 120
      },
      {
        _id:"",
        nombre:"prueba17",
        categoria: "prueba17",
        precio: 400,
        map_miscelanea:{
          tipo:"vehiculo",
          ruedas: 4
        },
        mapA_misc:[
          {color: "cafe"},
          {color: "verde"},
          {color: "amarillo"}
        ],
        v_precioImpuesto : 120
      },      
    ];

    if(this.pruebaIndexCrear < loteNuevos.length){
      docNuevo = loteNuevos[this.pruebaIndexCrear];
      this.pruebaIndexCrear++;
    }else{
      throw "eeee";
    }
    //--------------------------------------------------
    //================================================================
    //Configuracion de v_utiles antes de modificar y formatear doc
    const v_utilesMod:Iv_PreModificar_Productos = {
      config:{
        isCrear : true,
        orderIDKey : this.model_Util.getNumOrderKey(this.ultimoIDDoc),
        pathColeccion : this._pathColeccion
      }
    };

    docNuevo = this.model_Util.preCrearOActualizar(docNuevo, v_utilesMod);      
    //================================================================

    return new Promise<Producto>((resolve, reject)=>{
      //================================================================
      //Realizar la creacion
      const refColeccion = this._afs.collection<Producto>(this._pathColeccion);
      refColeccion.doc(docNuevo._id).set(docNuevo, { merge: true })
      .then(()=>{
        console.log(`el doc fue creado: ${docNuevo}` );
        resolve(docNuevo);
      })
      .catch((err)=>{
        console.log(`error al crear el producto: ${err}` );
        reject(err);
      });      
      //================================================================
    });
  }  

  actualizarDoc(docEditado?:Producto, isEditadoFuerte=false):Promise<Producto>{
    //----------------[EN CONSTRUCCION]----------------
    docEditado = <Producto>{
      _id:"1-9c73bc52fc92837d",
      // nombre:"Spark GT",
      // categoria: "carro",
      // precio: 140,
      map_miscelanea:{
        tipo:"vehiculo",
        ruedas: 4
      },
      // mapA_misc:[
      //   {color: "rojo"},
      //   {color: "Morado"}
      // ],
      v_precioImpuesto : 120
    }    
    //------------------------------------------------
    //================================================================
    //Configuracion de v_utiles antes de modificar y formatear doc
    const v_utilesMod:Iv_PreModificar_Productos = {
      config:{
        isCrear : false,
        isEditadoFuerte : false
      }
    };

    docEditado = this.model_Util.preCrearOActualizar(docEditado, v_utilesMod);      
    //================================================================
    return new Promise<Producto>((resolve, reject)=>{
      //================================================================
      //Realizar la actualizacion
      const refColeccion = this._afs.collection<Producto>(this._pathColeccion);
      refColeccion.doc(docEditado._id).update(docEditado)
      .then(()=>{
        console.log(`el doc fue Editado: ${docEditado}` );
        resolve(docEditado);
      })
      .catch((err)=>{
        console.log(`error al editar el producto: ${err}` );
        reject(err);
      });
      //================================================================
    });

  }

  eliminarDoc(_id? : string):Promise<string>{
    //----------------[EN CONSTRUCCION]----------------
    _id = "2-a940c69dbf6536cc";     
    //------------------------------------------------
    return new Promise<string>((resolve, reject)=>{

      const refColeccion = this._afs.collection<Producto>(this._pathColeccion);
      refColeccion.doc(_id).delete()
      .then(()=>{
        resolve(`documento con id: ${_id} fué borrado`);
      })
      .catch((err)=>{
        console.log(`error al borrar el documento: ${err}` );
        reject(err);
      });
    });
  }

  //================================================================================================================================
  //metodos Utilitarios:
  //================================================================
  //reinicializar parametros especiales de paginacion
  private resetParamsPaginacion(filtroDoc:IQFiltro_Producto){
    this._listDocsReactiveFull = [];
    this.snapshotDocsIniciales = [filtroDoc.docInicial];
    this.numPaginaActual = 0;
  }
  //================================================================
  //inicializar behaviors y subscripciones refernete a consultas
  public inicializarNuevaQueryDoc$(Docs$:IProductos$, filtroDoc:IQFiltro_Producto, next:(docRes)=>void, error:(err)=>void):IProductos${

    if (!Docs$ || !Docs$.behaviors || !Docs$.suscriptions) {
      Docs$ = {
        behaviors:[],
        suscriptions:[]
      };
    }
    
    this.resetParamsPaginacion(filtroDoc);

    if (filtroDoc.isPagReactivaFull == false) {
      if (Docs$.behaviors.length == 0 && Docs$.suscriptions.length == 0) {
        Docs$.behaviors[0] = new BehaviorSubject<IQFiltro_Producto>(filtroDoc);
        Docs$.suscriptions[0] = this.configurarBehaviorRes(Docs$.behaviors[0]).subscribe({next:next, error:error});   
      } else {
        Docs$.behaviors[0].next(filtroDoc);
      }
      
    } else {
      if (Docs$.behaviors.length > 0 && Docs$.behaviors.length == Docs$.suscriptions.length) {

        while (Docs$.suscriptions.length > 1) {
          Docs$.suscriptions[Docs$.behaviors.length-1].unsubscribe();
          Docs$.suscriptions.pop();
          Docs$.behaviors.pop()
        }
        Docs$.behaviors[0].next(filtroDoc);
      
      }else{
        Docs$.behaviors[0] = new BehaviorSubject<IQFiltro_Producto>(filtroDoc);
        Docs$.suscriptions[0] = this.configurarBehaviorRes(Docs$.behaviors[0]).subscribe({next:next, error:error});   
      }
    }
    return Docs$;
  }

  public inicializarNuevaQueryDocPath_Id$(DocsPath_Id$:IProductoPath_Id$, next:(docRes)=>void, error:(err)=>void, _id?:string):IProductoPath_Id${
    if (DocsPath_Id$.behavior == null && DocsPath_Id$.suscription) {
      DocsPath_Id$.behavior = new BehaviorSubject<string|null>(_id || null); 
      DocsPath_Id$.suscription = this.leerDocPorPathId(DocsPath_Id$.behavior).subscribe({next:next, error:error});        
    } else {
      if (_id) {
        DocsPath_Id$.behavior.next(_id);        
      }
    }
    return DocsPath_Id$;
  }
  //================================================================
  //paginar Docs:
  //este metodo determina detecta el tipo de paginacion y solicita el
  //lote de documentos de acuerdo a lso parametros
  public paginarDocs(Docs$:IProductos$, listDocs:Producto[], direccionPaginacion:"previo"|"siguiente", next?:(docRes)=>void, error?:(err)=>void):IProductos${

    const filtroDoc = Docs$.behaviors[Docs$.behaviors.length -1].getValue();     
    
    if (filtroDoc.isPagReactivaFull == false) {
      
      if (direccionPaginacion == "siguiente" &&
      listDocs.length == filtroDoc.limite) {
        filtroDoc.docInicial = this.snapshotDocsIniciales[this.numPaginaActual + 1];
        Docs$.behaviors[0].next(filtroDoc);
        this.numPaginaActual++;        
      }
      if (direccionPaginacion == "previo" &&
      listDocs.length > 0 && this.numPaginaActual > 0) {
        filtroDoc.docInicial = this.snapshotDocsIniciales[this.numPaginaActual - 1];
        Docs$.behaviors[0].next(filtroDoc);
        this.numPaginaActual--;
      }
    } else {

      if (direccionPaginacion != "previo") {

        let limiteLote = (this.numPaginaActual + 1) * filtroDoc.limite;
        if(listDocs.length == limiteLote ){
          
          filtroDoc.docInicial = this.snapshotDocsIniciales[this.numPaginaActual + 1];
          Docs$.behaviors.push(new BehaviorSubject<IQFiltro_Producto>(filtroDoc));
          this.numPaginaActual++;
  
          if (this.numPaginaActual > (Docs$.suscriptions.length -1)) {
            Docs$.suscriptions[this.numPaginaActual] = this.configurarBehaviorRes(Docs$.behaviors[Docs$.behaviors.length-1]).subscribe({next:next, error:error});    
          }
        }

      }
    }
    return Docs$;
  }
   
  //================================================================
  //configuracion de paginacion reactiva estandar
  private configurarPagReactiva(docsRes:Producto[], configFiltro:IQFiltro_Producto):Producto[]{
    //---falta implementar----
    return docsRes;
  }
  //================================================================
  //configuracion de paginacion reactiva Full
  private configurarPagReactivaFull(docsRes:Producto[], idxPag:number, filtroDoc:IQFiltro_Producto):Producto[]{
    
    let iniIdxSeccion = idxPag * filtroDoc.limite;
    let finIdxSeccion = (idxPag + 1) * filtroDoc.limite;

    let iniListDocsParcial:Producto[] = [];
    let finListDocsParcial:Producto[] = [];
    
    if (this._listDocsReactiveFull.length >= iniIdxSeccion) {
      iniListDocsParcial = this._listDocsReactiveFull.slice(0, iniIdxSeccion);
    }
    if (this._listDocsReactiveFull.length >= finIdxSeccion) {
      finListDocsParcial = this._listDocsReactiveFull.slice(finIdxSeccion);
    }              

    let lsD = iniListDocsParcial.concat(docsRes).concat(finListDocsParcial);
    if (lsD.length > 0) {
      this._listDocsReactiveFull = <Producto[]>this.model_Util.eliminarItemsDuplicadosArray(lsD, this.model_Util._id.nom);
    
    } else {
      this._listDocsReactiveFull = [];
    }   

    return this._listDocsReactiveFull;
  }

  //================================================================
  //liberador de memoria paginacion reactiva full
  //(desuscribe los observables que no estan siendo utilizados)
  public adminMemoriaReactivaFull(Docs$:IProductos$):IProductos$ {

    const filtroDoc = Docs$.behaviors[Docs$.behaviors.length-1].getValue();
    
    if (Docs$.suscriptions.length && Docs$.behaviors.length) {
      let pagRealEntero = (this._listDocsReactiveFull.length / filtroDoc.limite) + 1;
      let pagActualEntero = this.numPaginaActual + 1; 
      if (pagActualEntero >= pagRealEntero) {
        let diferencialExcesoMemoria = Math.floor(pagActualEntero/pagRealEntero) ;
        for (let i = 0; i < diferencialExcesoMemoria; i++) {
          //================================================================
          //liberar memoria de obserbables no usados
          Docs$.suscriptions[Docs$.suscriptions.length -1].unsubscribe();
          Docs$.suscriptions.pop();
          Docs$.behaviors.pop();
          this.snapshotDocsIniciales.pop();
          this.numPaginaActual--;                
          //================================================================
          
        }
      }       
    }
    
    return Docs$;

  }    
  //================================================================
  //desuscribir observables pricipales
  public unsubscribePrincipales(Docs$:IProductos$, DocsPath_Id$:IProductoPath_Id$){
    while (Docs$.behaviors.length > 0) {
      Docs$.suscriptions[Docs$.behaviors.length-1].unsubscribe();
      Docs$.suscriptions.pop();
      Docs$.behaviors.pop()
    }
    DocsPath_Id$.suscription.unsubscribe();
    DocsPath_Id$.behavior = null;

    this._UltimoDocSuscription.unsubscribe();
  }
  
  //================================================================
  //================================================================================================================================
}

export interface IProductos${
  behaviors:BehaviorSubject<IQFiltro_Producto>[],
  suscriptions:Subscription[]
}

export interface IProductoPath_Id${
  behavior:BehaviorSubject<string|null>,
  suscription:Subscription
}



