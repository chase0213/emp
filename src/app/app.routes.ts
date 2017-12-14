import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BlogIndexComponent } from './components/blog-index/blog-index.component';
import { PostComponent } from './components/post/post.component';

export const ROUTES: Routes = [
  {
    path: '',
    children: [
      { path: '', component: BlogIndexComponent },
      { path: 'posts', children: [
        { path: ':id', component: PostComponent },
      ]},
    ]
  }
];
