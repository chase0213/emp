import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss']
})
export class PostComponent implements OnInit {

  title$: Observable<string>;
  blog$: Observable<any>;

  constructor(
    private _route: ActivatedRoute,
    public bs: BlogService,
  ) { }

  ngOnInit() {
    this._route.params.first().subscribe(params => {
      if (params['id']) {
        this.title$ = this.bs.getTitle(params['id']);
        this.blog$ = this.bs.get(params['id']);
      }
    });
  }

}
