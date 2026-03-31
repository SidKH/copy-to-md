export type XPost = {
  id: string;
  authorHandle: string;
  postedAt: string;
  text: string;
  retweetCount: number;
  likeCount: number;
  links: string[];
};

export type XReply = {
  post: XPost;
  replies: XReply[];
};

export type XThread = {
  rootPost: XPost;
  replies: XReply[];
};
