import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {
  MatButtonModule,
  MatCardModule,
  MatChipsModule,
} from '@angular/material';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { BlogService } from './services/blog.service';

import { ROUTES } from './app.routes';

import { AppComponent } from './app.component';
import { BlogIndexComponent } from './components/blog-index/blog-index.component';
import { PostComponent } from './components/post/post.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AppComponent,
    BlogIndexComponent,
    PostComponent,
    HeaderComponent,
    FooterComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,

    // Material Module
    MatButtonModule,
    MatCardModule,
    MatChipsModule,

    RouterModule.forRoot(ROUTES, { useHash: true }),
  ],
  providers: [
    BlogService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
