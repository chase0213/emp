import { Component, OnInit } from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'app-aside-navigation',
  templateUrl: './aside-navigation.component.html',
  styleUrls: ['./aside-navigation.component.scss']
})
export class AsideNavigationComponent implements OnInit {

  tags$: Observable<string>;

  constructor(
    private bs: BlogService,
  ) { }

  ngOnInit() {
    this.tags$ = this.bs.tags();
  }

  onClickTag(event, tag) {
    this.bs.filterByTag(tag);
  }

}
