import {API_POST_LIKE, PostData, ReturnedPost} from "../../../common/common";
import {Auth, abortableJsonFetch, makeLocalUrl} from "../shared/shared";
import {AnimationVideo} from "./animationVideo";
import Avatar from "@material-ui/core/Avatar";
import Badge from "@material-ui/core/Badge";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import CardMedia from "@material-ui/core/CardMedia";
import FavoriteIcon from "@material-ui/icons/Favorite";
import IconButton from "@material-ui/core/IconButton";
import Link from "@material-ui/core/Link";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import React from "react";
import {ShareButton} from "./shareButton";
import Typography from "@material-ui/core/Typography";

export const createPsuedoPost = (
  id: string,
  userdata: PostData,
  replyId?: string,
  threadId?: string,
  title = "",
  message = ""
): ReturnedPost => ({
  id,
  threadId: threadId || id,
  title,
  message,
  userdata,
  replyId,
  userId: "",
  username: "Me",
  liked: false,
  likes: 0
});

interface PostProps {
  post: ReturnedPost;
  cardStyle?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  videoProps?: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
  history: import("history").History;
}

export const Post: React.FC<PostProps> = (props) => {
  const [liked, setLiked] = React.useState(props.post.liked);
  const [likes, setLikes] = React.useState(props.post.likes);

  // Since we create the psuedo post to start with, the like staet can change from props.
  React.useEffect(() => {
    setLiked(props.post.liked);
  }, [props.post.liked]);
  React.useEffect(() => {
    setLikes(props.post.likes);
  }, [props.post.likes]);

  return <Card
    key={props.post.id}
    id={props.post.id}
    style={props.cardStyle}
    onClick={props.onClick}>
    <CardHeader
      avatar={
        <Avatar>
          {props.post.username.slice(0, 1).toUpperCase()}
        </Avatar>
      }
      action={
        <IconButton>
          <MoreVertIcon />
        </IconButton>
      }
      title={props.post.title}
      subheader={props.post.username}
    />
    {
      props.post.userdata.type === "animation"
        ? <CardMedia>
          <AnimationVideo
            {...props.videoProps}
            id={props.post.id}
            width={props.post.userdata.width}
            height={props.post.userdata.height}
          />
        </CardMedia>
        : null
    }
    <CardContent>
      {props.post.replyId ? <Link href={`#${props.post.replyId}`}>IN REPLY TO</Link> : null}
      <Typography noWrap variant="body2" color="textSecondary" component="p">
        {props.post.message}
      </Typography>
    </CardContent>
    <CardActions disableSpacing>
      <IconButton
        color={liked ? "secondary" : "default"}
        onClick={async (e) => {
          e.stopPropagation();
          setLiked(!liked);
          const newLikes = liked ? likes - 1 : likes + 1;
          setLikes(newLikes);
          await abortableJsonFetch(API_POST_LIKE, Auth.Required, {id: props.post.id, value: !liked});
        }}>
        <Badge badgeContent={likes} color="primary">
          <FavoriteIcon />
        </Badge>
      </IconButton>
      <ShareButton
        title={props.post.title}
        url={makeLocalUrl(
          "/thread",
          {threadId: props.post.threadId},
          props.post.id === props.post.threadId ? null : props.post.id
        )}/>
      <div style={{flexGrow: 1}}></div>
      {
        props.post.userdata.type === "animation"
          ? <Button
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              props.history.push(`/editor?remixId=${props.post.id}`);
            }}>
              Remix
          </Button>
          : null
      }
    </CardActions>
  </Card>;
};
