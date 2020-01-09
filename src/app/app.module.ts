import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';

//================================================================
//Config. Firebase
import { AngularFireModule } from '@angular/fire';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { environment } from '../environments/environment'; 
//================================================================

import { ReactiveFormsModule  } from '@angular/forms';

import { AuthService } from './services/firebase/auth/auth.service';
import { UsuarioService } from './services/firebase/usuario/usuario.service';
import { ProductosComponent } from './sub-components/productos/productos.component';
import { ProductoService } from './services/firebase/producto/producto.service';
import { RolService } from './services/firebase/rol/rol.service';


@NgModule({
  declarations: [
    AppComponent,
    ProductosComponent
  ],
  imports: [
    BrowserModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    AngularFireAuthModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
  ],
  providers: [
    AuthService,
    ProductoService,
    UsuarioService,
    RolService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
