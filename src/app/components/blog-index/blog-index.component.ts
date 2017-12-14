import { Component, OnInit, OnDestroy } from '@angular/core';
import { BlogService } from '../../services/blog.service';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-blog-index',
  templateUrl: './blog-index.component.html',
  styleUrls: ['./blog-index.component.scss']
})
export class BlogIndexComponent implements OnInit, OnDestroy {

  blog$: Observable<any>;
  tags$: Observable<string>;
  subs = new Subscription();

  allPosts: any[] = [];
  postsInView: any[] = [];

  constructor(
    public bs: BlogService,
  ) { }

  ngOnInit() {
    this.subs.add(
      this.bs.index().subscribe(data => {
        this.allPosts = data.posts;
        this.postsInView = this.allPosts.slice();
      })
    );

    this.tags$ = this.bs.tags();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  onClickTag(event, tag) {
    this.bs.selectTag(tag);
    let tags = Object.keys(this.bs.selectedTags);

    // タグが未指定の場合は、全ポストを表示
    if (tags.length === 0) {
      this.postsInView = this.allPosts.slice();

    // タグが指定されている場合は、そのタグを含むポストを表示
    } else {
      this.postsInView = this.allPosts.filter((post) => {
        for (let tag of tags) {
          if (post.tag.indexOf(tag) >= 0) {
            return true;
          }
        }
        return false;
      });
    }
  }

}
