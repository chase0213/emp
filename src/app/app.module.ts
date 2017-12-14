import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
} from '@angular/material';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { BlogService } from './services/blog.service';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BlogIndexComponent } from './components/blog-index/blog-index.component';
import { PostComponent } from './components/post/post.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AsideNavigationComponent } from './components/aside-navigation/aside-navigation.component';

@NgModule({
  declarations: [
    AppComponent,
    BlogIndexComponent,
    PostComponent,
    HeaderComponent,
    FooterComponent,
    AsideNavigationComponent
  ],
  imports: [
    BrowserModule,
    HttpModule,

    // Material Module
    MatButtonModule,
    MatCardModule,
    MatChipsModule,

    AppRoutingModule
  ],
  providers: [
    BlogService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
