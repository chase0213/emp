import { Injectable } from '@angular/core';
import { Http } from '@angular/http';

import { Observable } from 'rxjs/Observable';

const INDEX_URL = 'https://raw.githubusercontent.com/chase0213/emp/master/data/index.json?token=ABbTgZ1wIkTku3iqtJVF8E7ZrMb_Oghlks5ZZQQLwA%3D%3D';

@Injectable()
export class BlogService {

  constructor(
    public http: Http,
  ) { }

  index(): Observable<any> {
    const url = INDEX_URL;
    return this.http.get(url).map(data => data.json()).first();
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
