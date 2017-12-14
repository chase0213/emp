import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlogService } from '../../services/blog.service';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss']
})
export class PostComponent implements OnInit, OnDestroy {

  title$: Observable<string>;
  tags$: Observable<string[]>;

  post: any = {};

  subs = new Subscription();

  constructor(
    private _route: ActivatedRoute,
    public bs: BlogService,
  ) { }

  ngOnInit() {
    this.subs.add(
      this._route.params.subscribe(params => {
        if (params['id']) {
          this.title$ = this.bs.getTitle(params['id']);
          this.tags$ = this.bs.getTags(params['id']);

          this.subs.add(
            this.bs.get(params['id']).subscribe(post => {
              this.post = post;
            })
          )
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

}
