import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-blog-index',
  templateUrl: './blog-index.component.html',
  styleUrls: ['./blog-index.component.scss']
})
export class BlogIndexComponent implements OnInit {

  blog$: Observable<any>;
  tags$: Observable<string>;

  constructor(
    public bs: BlogService,
  ) { }

  ngOnInit() {
    this.blog$ = this.bs.index();
  }

}
