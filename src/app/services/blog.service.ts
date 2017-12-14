import { Injectable } from '@angular/core';
import { Http } from '@angular/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/first';

declare const marked: any;

const INDEX_URL = 'https://raw.githubusercontent.com/chase0213/emp/master/data/index.json';
const SHOW_BASE_URL = 'https://raw.githubusercontent.com/chase0213/emp/master/data/posts/';

@Injectable()
export class BlogService {

  constructor(
    public http: Http,
  ) { }

  index(): Observable<any> {
    const url = INDEX_URL;
    return this.http.get(url).map(data => data.json()).first();
  }

  get(src: string): Observable<any> {
    const url = SHOW_BASE_URL + src + '.md';
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      sanitize: false,
      smartLists: true,
      smartypants: false
    });
    return this.http.get(url).map(data => marked(data.text())).first();
  }

  getTitle(src: string): Observable<string> {
    return Observable.create(obs => {
      this.index().subscribe(list => {
        for (let item of list.posts) {
          if (item.src === src) {
            obs.next(item.title);
            obs.complete();
            return;
          }
        }
        obs.error('Title for "' + src + '" not found.');
      });
    });
  }

  tags(): Observable<string> {
    return Observable.create(obs => {
      let tags = [];
      let memo = {};
      const url = INDEX_URL;
      this.http.get(url).map(data => data.json()).first().subscribe(data => {
        try {
          for (let post of data.posts) {
            for (let tag of post.tag) {
              if (!memo[tag]) {
                tags.push(tag);
                memo[tag] = true;
              }
            }
          }
          obs.next(tags);
        } catch (e) {
          obs.error(e);
        } finally {
          obs.complete();
        }
      });
    });
  }

  filterByTag(tag: string) {

  }

}
