import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup } from "@angular/forms";

import { IRunFunSuscribe } from 'src/app/services/ServiceHandler$';
import { Fs_ModelService, ETypePaginate, ETypePaginatePopulate } from 'src/app/services/firebase/fs_Model_Service';

import { AuthService, ETipoAuth } from 'src/app/services/firebase/auth/auth.service';
import { AuthNoSocial,  } from 'src/app/models/firebase/auth/authNoSocial';

import { Producto, IProducto } from '../../models/firebase/producto/producto';
import { ProductoService, Ifs_FilterProducto } from '../../services/firebase/producto/producto.service';

import { emb_SubColeccion, Iemb_SubColeccion } from 'src/app/models/firebase/producto/emb_subColeccion';
import { emb_subColeccionService, Ifs_FilterEmb_SubColeccion } from 'src/app/services/firebase/producto/emb_subcoleccion.service';

import { Rol, IRol } from 'src/app/models/firebase/rol/rol';
import { RolService, Ifs_FilterRol } from 'src/app/services/firebase/rol/rol.service';


import { testConsumidorFabrica } from 'src/app/testFactori/test';


@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.css']
})
export class ProductosComponent implements OnInit, OnDestroy {

  //contenedor de documento para trabajo en plantilla
  public Producto:Producto; 

  public keyProducto$:string;
  //public Producto_pathDocCtrl$:IpathDoc$<Producto>;

  public keyEmb_SubColeccion$:string;

  //array de documentos obtenidos de la bd
  //de acuerdo a los filtros aplicados
  public listProductos:Producto[];

  public Productos_Path_Id:Producto | null;

  //Campos del formulario para crear o editar documento
  public formCrearOActualizar:FormGroup; 
  
  constructor(//public _AuthService:AuthService,
              public _ProductoService:ProductoService,
              public _emb_SubColeccionService:emb_subColeccionService,
             
             ) {
 
    //preparar la inicializacion de objetos principales
    this.Producto = new Producto();
    this.listProductos = []; 

    //inicializacion de controls
    this.keyProducto$ = this._ProductoService.createHandler$(this.RFS_Productos, "Handler", "Component");
    //this.Producto_pathDocCtrl$ = this._ProductoService.createHandler$(this.RFS_Productos_pathDoc, "pathHandler");
    this.keyEmb_SubColeccion$ = this._emb_SubColeccionService.createHandler$(this.RFS_Emb_SubColeccion, "Handler", "Component");


    //­­­___ <TEST> _____________________________________________________
        
    let dataP = [
      "Productos/16f1ec3ddfd-81de43de6700c3c7",
      "Productos/171d53bff26-9e81e5e8c977923b",
      "Productos/171d53bff27-b5f383be86246a9f",
      "Productos/171d540091a-9a52d51a6fb23af5",
      "Productos/171da99f76d-8827390122a80ede",
      "Productos/171e0ce4dd5-a52a8f0ac110503d",
      "Productos/171e0ce5404-9c6490a539895e6f",
      "Productos/171e0ce5945-b138cb67ffa406fd",
      "Productos/171e0ce5e06-a2eb5f8148ba1964",
      "Productos/171e0ce653d-826df3f4b3111fad",
      "Productos/171e0ce6925-907198e3c1f874d7",
      "Productos/171e0ce6d0e-8eaeafdc7108ec1e",
      "Productos/171e0ce70f6-b2e907f330f55587",
      "Productos/171e0efbf6c-ae95fe294cba472b",
      "Productos/171e0efc34a-ae570e8d97c36420",
      "Productos/171e0efc732-b9e4d4f52977bb28",
      "Productos/171e0efcea0-8549fd9fad2eb7a6",
      "Productos/171e0efd287-b59269f157955713",
      "Productos/171e0efd681-8f626cd54edaddcc",
      "Productos/171e0efda57-8a013f4b76ba8eaa",
      "Productos/171e0efde3f-b35dfa50d55b4432",
    ]

    const rfsP:IRunFunSuscribe<Producto[]> = {
      next:(d) => {
          this.listProductos = d;
          return;
      },
      error:(error)=>{ console.log(error)}
    };

    //this._ProductoService.get$( this.keyProducto$, {limit:5, typePaginate:ETypePaginate.Accumulative});
    const keyPathP = this._ProductoService.createHandler$(rfsP, "PathHandler", "Component");
    this._ProductoService.populate$(keyPathP, dataP, ETypePaginatePopulate.Full);
    setTimeout(() => {
      this._ProductoService.pagitanePopulate$(keyPathP, "nextPage");      
      setTimeout(() => {
        this._ProductoService.pagitanePopulate$(keyPathP, "previousPage");
      }, 10000);
    }, 10000);

    //________________________________________________________________

  }

  //================================================================================================================================
  //Hooks de componente angular:
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
    //desuscribirse de todos los observables que 
    //use este componente 
    this._ProductoService.closeHandlersOrPathHandlers$([
      this.keyProducto$,
    ]);

    this._ProductoService.closeHandlersOrPathHandlers$([
      this.keyEmb_SubColeccion$
    ]);    
    //================================================
  }

  //================================================================
  //propiedades metodos de ejecucion next y error para las suscripciones
  //dentro de cada una se ejecuta el codigo una vez leido los docs
  //desde la base de datos (sea poruna nueva solicitud query o por algun cambio 
  //detectado por los observables asignados)

  private RFS_Productos:IRunFunSuscribe<Producto[]> = {
    next:(docRes)=>{
      this.listProductos = docRes;  
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Productos_pathDoc:IRunFunSuscribe<Producto> = {
    next:(docRes)=>{
      this.Productos_Path_Id = docRes;
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_Emb_SubColeccion:IRunFunSuscribe<emb_SubColeccion[]> = {
    next:(docRes)=>{
      let test = docRes;
      let a ="";
    }, 
    error:(err)=>{
      console.log(err);
    }
  };

  private RFS_poblar:IRunFunSuscribe<any> = {
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

    this._ProductoService.paginate$(this.keyProducto$, "previousPage");
  }

  public paginarSiguiente(){

    this._ProductoService.paginate$(this.keyProducto$, "nextPage");
  }

  //================================================================
  //metodos que ejecutan nuevas consultas
  //ES MEJOR USAR METODOS INDEPENDIENTES ESTO ES SOLO PRUEBA

  public consultarProducto(opc: "Todo"|"_id"|"Nombre"|"Precio"|"Ruedas"|"ArrayNormal"|"SubCol"|"SubColGrup"){
    Promise.all([
      this._ProductoService.ready(),
      this._emb_SubColeccionService.ready() 
    ])
    .then(()=>{
      
      let Ufilter = <Ifs_FilterProducto>{};  
      let emb_filter = <Ifs_FilterEmb_SubColeccion>{}    
      
      //A modo de prueba:
      //this._ProductoService.HooksService;
      
      switch (opc) {
        case "Todo":
          this._ProductoService.get$(this.keyProducto$, Ufilter);
          break;
        case "_id":
          this._ProductoService.getId$(this.keyProducto$, "IDxxxxxxxxxxxxx");
          break;        
        case "Nombre":
          Ufilter.VQ_IniStr = {};
          Ufilter.VQ_IniStr.nombre = "ha";

          this._ProductoService.getPorNombre$(this.keyProducto$, Ufilter);
          break;  
        case "Precio":
          Ufilter.VQ_EqualNum = {};
          Ufilter.VQ_EqualNum.precio = 100;
          // Ufilter.VQ_LtEqNum = {};
          // Ufilter.VQ_LtEqNum.precio = 300;          

          this._ProductoService.getPorPrecio$(this.keyProducto$, Ufilter);
          break;
        case "Ruedas":
          
          Ufilter.VQ_EqualNum = {};
          Ufilter.VQ_EqualNum.map_miscelanea = {ruedas:4};

          this._ProductoService.getPorMiscRuedas$(this.keyProducto$, Ufilter);
          break;  
  
        case "ArrayNormal":
          this._ProductoService.getPorArrayNormal$(this.keyProducto$, Ufilter);    
          break;
        case "SubCol":
          emb_filter.path_EmbBase = this.listProductos[0]._pathDoc; 
          this._emb_SubColeccionService.get$(this.keyEmb_SubColeccion$, emb_filter);    
          break;           
        case "SubColGrup":
          emb_filter.path_EmbBase = null; 
          this._emb_SubColeccionService.get$(this.keyEmb_SubColeccion$, emb_filter);    
          break;        
      
        default:
          break;
      }
    })
    .catch((err)=>{
      console.log(err)
    });

  }
  //================================================================================================================================

  singUpEmail(){
    const credencial = <AuthNoSocial>{
      email: "magles@magles.com",
      pass : "123456"
    }
    
    // this._AuthService.signUpNoSocial(credencial)
    // .then((result)=>{
    //   let p = result;
    // })
    // .catch((err)=>{
    //   console.log(err);
    // });
  }

  login(tipo:ETipoAuth){
    // const credencial = <AuthNoSocial>{
    //   email: "andres@andres.com",
    //   pass : "987000"
    // }
    // this._AuthService.login(tipo, credencial)
    // .then((result)=>{
    //   let p = result;
    // })
    // .catch((err)=>{
    //   console.log(err);
    // });
  }

  logout(){
    // this._AuthService.logout()
    // .then(()=>{

    // })
    // .catch((err)=>{
    //   console.log(err);
    // });
  }
  //================================================================================================================================

  public crearOActualizar(docAnterior?:Producto){

    let doc = <Producto>this.formCrearOActualizar.value;

    //================================================
    //determinar si es actualizar o crear (dependiendo 
    //si se recibe docAnterior)
    if (docAnterior) {
      this._ProductoService.update(doc)
      .then((docActualizado)=>{
        console.log("987Actualizado: " + docActualizado);
        this.formCrearOActualizar.reset();
      })
      .catch((error)=>{
        console.log("987 Error al Actualizalo: " + error);
      });           
    } else {
      this._ProductoService.create(doc)
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
        this._ProductoService.create(<Producto>{}) //<Producto>{}solo para ejemplo
        .then(()=>{
          console.log("ya en el componente: ");
        })
        .catch(err=>{
          console.log("tratar el erro en el componente " + err);
        })
        break;

      case "subCol":
        const path_embBase = "Productos/16f1ec3ddfd-81de43de6700c3c7";
        this._emb_SubColeccionService.create(<emb_SubColeccion>{}, path_embBase) //emb_SubColeccion>{}solo para ejemplo
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
    this._ProductoService.update(<Producto>{})//<Producto>{}solo para ejemplo
    .then(()=>{
      console.log("EDITADO ya en el componente: ");
    })
    .catch(err=>{
      console.log("EDITAR tratar el error en el componente " + err);
    })
  }

  eliminar(){
    this._ProductoService.delete("") //""solo para ejemplo
    .then(()=>{
      console.log("borrado ya en el componente: ");
    })
    .catch(err=>{
      console.log("borrado tratar el error en el componente " + err);
    })
  }

}

//================================================================================================================================
