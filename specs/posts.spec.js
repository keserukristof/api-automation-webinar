'use strict';

const chakram = require('chakram');
const expect = chakram.expect;
const api = require('./utils/api');
const data = require('../server/data.json');

describe('Posts', () => {
    describe('Create', () => {
        let addedId;

        it('should add a post', () => {
            const postToAdd = {
                "userId": 1,
                "title": "test title",
                "body": "test body"
            };
            return chakram.post(api.url('posts'), postToAdd)
                .then(responseFromPost => {
                    expect(responseFromPost.response.statusCode).to.match(/^20/);
                    addedId = responseFromPost.body.data.id;
                    chakram.get(api.url(`posts/${addedId}`)).then(responseFromGet => {
                        expect(responseFromGet.body.data).to.deep.equal(responseFromPost.body.data);
                    });
                    return chakram.wait();
                });
        });

        it('should not add a post with existing id', () => {
            const postToAdd = {
                "id": 1,
                "userId": 1,
                "title": "test title",
                "body": "test body"
            };
            const response = chakram.post(api.url('posts'), postToAdd);
            expect(response).to.have.status(500);
            return chakram.wait();
        });

        after(() => {
            if (addedId) {
                return chakram.delete(api.url(`posts/${addedId}`));
            }
        })
    });

    describe('Read', () => {
        it('should return all the posts', () => {
            const response = chakram.get(api.url('posts'));
            expect(response).to.have.status(200);
            expect(response).to.have.json('data', posts => {
                expect(posts).to.be.instanceof(Array);
                expect(posts.length).to.be.greaterThan(0);
            });
            return chakram.wait();
        });

        it('should return a given post', async () => {
            const expectedPost = data.posts[0];
            const response = await chakram.get(api.url(`posts/${expectedPost.id}`));
            expect(response).to.have.status(200);
            expect(response).to.have.json('data', post => {
                expect(post).to.be.defined;
                expect(post).to.deep.equal(expectedPost);
            });
            return chakram.wait();
        });

        it('should not return a post with non-existing id', () => {
            const response = chakram.get(api.url('posts/234235325'));
            expect(response).to.have.status(404);
            return chakram.wait();
        });

        describe('Filter', () => {
            it('should return posts by title', () => {
                const expectedPost = data.posts[0];
                const response = chakram.get(api.url('posts', `title=${encodeURIComponent(expectedPost.title)}`));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts[0]).to.deep.equal(expectedPost);
                })
                return chakram.wait();
            });

            it('should not return anything in case of impossible filter', () => {
                const IMPOSSIBLE_FILTER = "impossible-filter"
                const response = chakram.get(api.url(`posts/${IMPOSSIBLE_FILTER}`));
                return expect(response).to.have.status(404);
            });

            it('should ignore filtering if invalid filter passed', () => {
                const NOT_EXISTING_ID = 100000000
                const response = chakram.get(api.url('posts', `id=${NOT_EXISTING_ID}`));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(0);
                })
                return chakram.wait();
            });
        })

        describe('Paginate', () => {
            it('should return 10 post by default', () => {
                const response = chakram.get(api.url('posts', '_page=2'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(10);
                });
                return chakram.wait();
            });

            it('should return as many posts as we specified in the _limit filter', () => {
                const response = chakram.get(api.url('posts', '_page=7&_limit=3'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(3);
                    const expectedIds = [19, 20, 21];
                    expectedIds.forEach((currentValue, indexOfCurrentValue) => {
                        expect(posts[indexOfCurrentValue].id).to.equal(currentValue);
                    })
                });
                return chakram.wait();
            });

            it('should return 10 posts per page if the filters are not correctly specified', () => {
                const response = chakram.get(api.url('posts', '_page=incorrect-page&_limit=incorrect-limit'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(10);
                    for (let currentIndex = 0; currentIndex < 10; currentIndex++) {
                        expect(posts[currentIndex].id).to.equal(currentIndex + 1);
                    }
                });
                return chakram.wait();
            });

            it('should not return anything if the given page number is bigger than the last page', () => {
                const TOO_BIG_PAGE_NUMBER = 1000000;
                const response = chakram.get(api.url('posts', `_page=${TOO_BIG_PAGE_NUMBER}`));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(0);
                });
                return chakram.wait();
            })
        });

        describe('Sort', () => {
            it('should return the sored posts', () => {
                const response = chakram.get(api.url('posts', '_sort=title&_order=desc&_page=1'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    const titles = posts.map(post => post.title);
                    expect(titles).to.be.descending;
                });
                return chakram.wait();
            });

            it('should return the posts by default in case of incorrectly specified _sort or _order', () => {
                const response = chakram.get(api.url('posts', '_sort=incorrectSor&_order=asd&_page=1'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    for (let currentIndex = 0; currentIndex < 10; currentIndex++) {
                        expect(posts[currentIndex].id).to.equal(data.posts[currentIndex].id);
                    }
                });
                return chakram.wait();
            });

            it('should sort the results by ascending order if incorrect value passed to the _order', () => {
                const response = chakram.get(api.url('posts', '_sort=body&_order=incorrectOrder&_page=1'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    const titles = posts.map(post => post.body);
                    expect(titles).to.be.ascending;
                })
                return chakram.wait();
            });
        });

        describe('Slice', () => {
            it('should return the correct posts started form the _start value to the _end', () => {
                const response = chakram.get(api.url('posts', '_start=20&_end=23'));
                expect(response).to.have.status(200);
                expect(response).to.have.header('X-Total-Count', '100');
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(3);
                    const ids = [21, 22, 23];
                    ids.forEach((currentId, index) => {
                        expect(posts[index].id).to.equal(currentId);
                    });
                });
                return chakram.wait();
            });

            it('should return all posts, if the _start or the _end is not defined', () => {
                const response = chakram.get(api.url('posts', '_start=20'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(100);
                })
                return chakram.wait();
            });

            it('should return posts counted from the end of all posts, if the _start value is a negative number', () => {
                const response = chakram.get(api.url('posts', '_start=-21&_end=90'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(11);
                    expect(posts[0].id).to.equal(80);
                    expect(posts[10].id).to.equal(90);
                })
                return chakram.wait();
            })
        });

        describe('Operators', () => {
            describe('Greater Than', () => {
                it('should return posts that has _gte (Greater Than or Equal) value or bigger userId', () => {
                    const response = chakram.get(api.url('posts?userId_gte=9'));
                    expect(response).to.have.status(200);
                    expect(response).to.have.json('data', posts => {
                        expect(posts).to.be.instanceof(Array);
                        posts.forEach(post => {
                            expect(post.userId).to.be.above(8);
                        })
                    })
                    return chakram.wait();
                });

                it('should not return any posts if the _gte value is not valid', () => {
                    const response = chakram.get(api.url('posts', 'userId_gte=1244'));
                    expect(response).to.have.status(200);
                    expect(response).to.have.json('data', posts => {
                        expect(posts).to.be.instanceof(Array);
                        expect(posts.length).to.equal(0);
                    });
                    return chakram.wait();
                });
            });

            describe('Less Than', () => {
                it('should return posts that has _lte (Less Than or Equal) value or smaller id', () => {
                    const response = chakram.get(api.url('posts', 'userId_lte=1'));
                    expect(response).to.have.status(200);
                    expect(response).to.have.json('data', posts => {
                        expect(posts).to.be.instanceof(Array);
                        posts.forEach(post => {
                            expect(post.userId).to.be.below(2);
                        })
                    })
                    return chakram.wait();
                });
                it('should not return any posts if the _lte value is not valid', () => {
                    const response = chakram.get(api.url('posts', 'userId_lte=-101'));
                    expect(response).to.have.status(200);
                    expect(response).to.have.json('data', posts => {
                        expect(posts).to.be.instanceof(Array);
                        expect(posts.length).to.equal(0);
                    });
                    return chakram.wait();
                });
            });

            describe('Greater Than and Less Than', () => {
                it('should return posts for _gte and _lte specified for two or more field', () => {
                    const response = chakram.get(api.url('posts', 'userId_gte=10&userId_lte=7'));
                    expect(response).to.have.status(200);
                    expect(response).to.have.json('data', posts => {
                        expect(posts).to.be.instanceof(Array);
                        expect(posts.length).to.equal(0);
                    })
                    return chakram.wait();
                });
            });

            describe('Not Equal', () => {
                it('should return all the posts, except the posts that has not got the _ne value for the specified field', () => {
                    const response = chakram.get(api.url('posts', 'id_ne=1'));
                    expect(response).to.have.status(200);
                    expect(response).to.have.json('data', posts => {
                        expect(posts).to.be.instanceof(Array);
                        const notExpectedPosts = posts.filter(post => post.id === '1');
                        expect(notExpectedPosts.length).to.equal(0);
                    });
                    return chakram.wait();
                });
            });
        });

        describe('Like', () => {
            it('should return all posts that include the specified value for _like', () => {
                const response = chakram.get(api.url('posts', 'title_like=sunt'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    posts.forEach(post => {
                        expect(post.title).to.include('sunt');
                    });
                });
                return chakram.wait();
            });

            it('should not return a post if the specified value for _like not suitable for any post', () => {
                const response = chakram.get(api.url('posts', 'title_like=asddgfshfhdfbdbdbbbb'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(0);
                });
                return chakram.wait();
            });
        });

        describe('Full-Text Search', () => {
            it('should return the posts that has exactly match for the specified value of q', () => {
                const response = chakram.get(api.url('posts', 'q=magnam'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    posts.forEach(post => {
                        const concatTitleAndBody = post.title + post.body;
                        expect(concatTitleAndBody).to.include('magnam');
                    });
                });
                return chakram.wait();
            });

            it('should not return any post if that has not got exactly match for the specified value of q', () => {
                const response = chakram.get(api.url('posts', 'q=magnammagnammagnammagnammagnam'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(0);
                });
                return chakram.wait();
            });
        });

        describe('Relationships', () => {
            it('should return all comments for a given post', () => {
                const response = chakram.get(api.url('posts/3', '_embed=comments'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', post => {
                    expect(post).to.be.defined;
                    post.comments.forEach(comment => {
                      expect(comment.postId).to.equal(3);
                   });
                });
                return chakram.wait();
            });

            it('should return all comments for all posts', () => {
                const response = chakram.get(api.url('posts', '_embed=comments'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    posts.forEach(post => {
                        post.comments.forEach(comment => {
                            expect(comment.postId).to.equal(post.id);
                        });
                    })
                });
                return chakram.wait();
            });

            it('should return all the posts with an extra field based on the _embed value', () => {
                const response = chakram.get(api.url('posts', '_embed=NotCorrectValue'));
                expect(response).to.have.status(200);
                expect(response).to.have.json('data', posts => {
                    expect(posts).to.be.instanceof(Array);
                    expect(posts.length).to.equal(100);
                    posts.forEach(post => {
                       expect(post).to.have.property('NotCorrectValue');
                    });
                });
                return chakram.wait();
            });
        });
    });

    describe('Update', () => {
        it('should update an existing post', () => {
            const postUpdate = {
                "userId": 1,
                "title": "updated title",
                "body": "updated body"
            }
            const postId = 16
            const response = chakram.put(api.url(`posts/${postId}`), postUpdate);
            expect(response).to.have.status(200);
            const updatedPost = chakram.get(api.url(`posts/${postId}`));

            expect(updatedPost).have.json('data', post => {
                expect(post).to.be.defined;
                expect(post.userId).to.equal(postUpdate.userId);
                expect(post.title).to.equal(postUpdate.title);
                expect(post.body).to.equal(postUpdate.body);
            })
            return chakram.wait();
        });

        it('should not update a post with non-existing id', () => {
            const postUpdate = {
                "userId": 1,
                "title": "updated title",
                "body": "updated body"
            };
            const response = chakram.put(api.url('posts/111'), postUpdate);
            expect(response).to.have.status(404);
            return chakram.wait();
        });
    });

    describe('Delete', () => {
        it('should delete an existing post', () => {
            const response = chakram.delete(api.url('posts/88'));
            expect(response).to.have.status(200);
            const notExistingPost = chakram.get(api.url(`posts/88`));
            expect(notExistingPost).to.have.status(404);
            return chakram.wait();
        });

        it('should not delete a post which does not exists', () => {
            const response = chakram.delete(api.url('posts/1442'));
            expect(response).to.have.status(404);
            return chakram.wait();
        });
    });
});