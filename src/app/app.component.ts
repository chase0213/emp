import { Component } from '@angular/core';
import { BlogService } from './services/blog.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  constructor(
    public bs: BlogService,
  ) {}

  onSelectTag(tag: string) {
    this.bs.selectTag(tag);
  }
}
