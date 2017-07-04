import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BlogIndexComponent } from './components/blog-index/blog-index.component';
import { PostComponent } from './components/post/post.component';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: BlogIndexComponent },
      { path: ':id', component: PostComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
