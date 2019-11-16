//================================================================================================================================
//los servicios en angular implementas las funciones (en muchos casos las CRUD) de los datos recibidos 
// desde firebase, en otras palabras hace las veces de controller para angular

//================================================================================================================================

import { Injectable } from '@angular/core';

import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';

import { Observable, observable, Subject, BehaviorSubject, from, fromEvent, of, Subscription, interval, timer, combineLatest } from 'rxjs';
import { map, switchMap, mergeAll, concatAll, concatMap, mergeMap, mapTo, toArray, concat } from 'rxjs/operators';

import { IProducto, IProducto$, Producto, Producto_Util, Iv_PreModificar_Productos  } from '../../../models/firebase/productos/productos';


@Injectable({
  providedIn: 'root'
})
export class ProductosService {

  public model_Util:Producto_Util;
  private _pathColeccion:string ;

  public ultimoIDDoc:string;

  constructor(private _afs:AngularFirestore) {

    //================================================================
    //cargar la configuracion de la coleccion
    this.model_Util = new Producto_Util();
    //----------------[EN CONSTRUCCION]----------------
    this._pathColeccion = this.model_Util.getPathColeccion("");    
    //------------------------------------------------
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
  //propiedades metodo de lecturas, esta propiedades se les asignan los metodos personalizados de cada lectura
  //con el fin de ser transportados por el objeto filtro de cada BehaviorSubject determinado

  public leerDocs = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtro:IProducto$)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
    cursorQueryRef = cursorQueryRef.orderBy(this.model_Util._id.nom, filtro.orden._id || "asc");
    if (filtro.docInicial && filtro.docInicial != null) {
      cursorQueryRef = cursorQueryRef.startAfter(filtro.docInicial._id);//
    } else {
      cursorQueryRef = cursorQueryRef.startAfter(null);//
    }
    
    cursorQueryRef = cursorQueryRef.limit(filtro.limite || 10);  //   
    return cursorQueryRef;  
  };   

  public leerID = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtro:IProducto$)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
    cursorQueryRef = cursorQueryRef.where(this.model_Util._id.nom, "==", filtro.docValores._id);
    return cursorQueryRef;
  }; 

  public leerUltimoDoc = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtro:IProducto$)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
    cursorQueryRef = cursorQueryRef.orderBy(this.model_Util._id.nom, "desc");
    cursorQueryRef = cursorQueryRef.limit(1); //se determina que SOLO DEBO LEER EL ULTIMO
    return cursorQueryRef;  
  }; 
  

  public leerNombre = (ref:firebase.firestore.CollectionReference | firebase.firestore.Query, filtro:IProducto$)=>{
    let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;

    cursorQueryRef = cursorQueryRef.where(this.model_Util.nombre.nom, ">", filtro.docValores.nombre);
    //.where(this.model_Util.nombre.nom, "<", "c");
    cursorQueryRef = cursorQueryRef.orderBy(this.model_Util.nombre.nom,  "asc");
    // cursorQueryRef = cursorQueryRef.orderBy(this.model_Util._id.nom,  "asc");
    cursorQueryRef = cursorQueryRef.limit(filtro.limite || 10);  //  
    if (filtro.docInicial && filtro.docInicial != null) {
      cursorQueryRef = cursorQueryRef.startAfter(filtro.docInicial);// filtro.docInicial.nombre, filtro.docInicial._id 
    } else {
      cursorQueryRef = cursorQueryRef.startAfter(null);//
    }
    
    
    return cursorQueryRef;  
  }; 
  
  //================================================================================================================================
  //================================================================
  // metodo de lectura principal con opcion de filtros dinamicos
  //Parametros:
  //filtro$ -> es un BehaviorSubject<IDoc$>  (subjet especial que permite enviar parametros iniciales 
  //           antes de la  primera subscripcion al observador), esta tipado con la interfaz 
  //           especial   IDoc$  (donde   Doc   es el modelo a usa)la cual implementa en un solo objeto 
  //           todos los campos especiales para el filtrado con el fin de que. 
  //           Este   filtro$   es declarado en la respectiva   clase.component.ts  donde se requiera subscribirse  

  leerDocsFiltro(filtro$:BehaviorSubject<IProducto$>):Observable<Producto[]>{
    //el pipe y el switchMap permiten trabajar con   BehaviorSubject<IDoc$>
    //de forma dinamica asi que solo usando llamadas   filtro$.next({objeto con filtros}) 
    return filtro$
          .pipe(switchMap((filtro)=>{ 
            //================================================================
            //configuracion inicial para la lectura de docs en OPCION COLECCION
            //se debe garantizar que  getPathColeccion()   devuelva un path para 
            //coleccion o sub coleccion.
            //el callback   (ref)=>{}   permite la creacion del cursor de consulta  
            //e implementar los filtros
            
            //================================================================ 
            return this._afs.collection(this._pathColeccion, (ref)=>{

              //================================================================
              //Declaracion e inicializacion del cursor
              let cursorQueryRef : firebase.firestore.CollectionReference | firebase.firestore.Query = ref;           
              //ejecuta el metodo de consulta enviado en el filtro
              cursorQueryRef = filtro.query(cursorQueryRef, filtro);
              //================================================================
              
              return cursorQueryRef;
            })
            .snapshotChanges()  //devuelve docs y metadata
            .pipe(
              map(actions => {
                let docsLeidos = actions.map(a => {
                  const data = a.payload.doc.data() as Producto;
                  const _id = a.payload.doc.id;
                  return { _id, ...data };
                })
                //================================================================
                //Aqui realizar el codigo a ejecutar antes de entregar los docs
                //y que requiera operaciones adicionales a nivel de array 
                //como sumatorias agrupaciones y demas
                //sin embargo esto se deberia hacer con la libreria de rxJs
                //================================================================
                return docsLeidos;
              })                
            );
                        
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
}




