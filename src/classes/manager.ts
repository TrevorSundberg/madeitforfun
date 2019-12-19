import {Timeline, Track, Tracks} from "./timeline";
import {Gizmo} from "./gizmo";

export type ElementFactory = (id: string) => Promise<HTMLElement>;

export interface WidgetConstructor {
  id?: string;
}

export interface WidgetImage extends WidgetConstructor {
  type: "image";
  src: string;
}

export interface WidgetText extends WidgetConstructor {
  type: "text";
}

export type WidgetInit = WidgetImage | WidgetText;

export interface SerializedData {
  tracks: Tracks;
  videoSrc: string;
  widgets: WidgetInit[];
}

export class Widget {
  public readonly element: HTMLElement;

  public readonly init: WidgetInit;

  /** @internal */
  public constructor (element: HTMLElement, init: WidgetInit) {
    this.element = element;
    this.init = init;
  }
}

export class Manager {
  private container: HTMLDivElement;

  private video: HTMLVideoElement;

  private timeline = new Timeline()

  private selection: Gizmo = null;

  private idCounter = 0;

  private widgets: Widget[] = [];

  public constructor (container: HTMLDivElement, video: HTMLVideoElement) {
    this.container = container;
    this.video = video;
    this.update();

    const updateContainerSize = (videoWidth: number, videoHeight: number, scale: number) => {
      container.style.width = `${videoWidth}px`;
      container.style.height = `${videoHeight}px`;
      container.style.transform = `translate(${0}px, ${0}px) scale(${scale})`;

      const width = videoWidth * scale;
      const height = videoHeight * scale;

      container.style.left = `${(window.innerWidth - width) / 2}px`;
      container.style.top = `${(window.innerHeight - height) / 2}px`;
    };

    const onResize = () => {
      const videoWidth = video.videoWidth || 1280;
      const videoHeight = video.videoHeight || 720;
      const videoAspect = videoWidth / videoHeight;
      const windowAspect = window.innerWidth / window.innerHeight;

      if (videoAspect > windowAspect) {
        updateContainerSize(videoWidth, videoHeight, window.innerWidth / videoWidth);
      } else {
        updateContainerSize(videoWidth, videoHeight, window.innerHeight / videoHeight);
      }
    };
    video.addEventListener("canplay", onResize);
    window.addEventListener("resize", onResize);
    onResize();
  }

  public save (): SerializedData {
    return {
      tracks: JSON.parse(JSON.stringify(this.timeline.tracks)),
      videoSrc: this.video.src,
      widgets: this.widgets.map((widget) => JSON.parse(JSON.stringify(widget.init)))
    };
  }

  public async load (data: SerializedData) {
    this.video.src = data.videoSrc;
    this.clearWidgets();
    for (const init of data.widgets) {
      await this.addWidget(init);
    }
    this.timeline.tracks = data.tracks;
    this.timeline.updateTracks();
    // Force a chance so everything updates
    this.timeline.setTime(1);
    this.timeline.setTime(0);
    this.video.currentTime = 0;
  }

  private update () {
    requestAnimationFrame(() => {
      this.update();
    });
    const {currentTime} = this.video;
    if (this.timeline.getTime() !== currentTime) {
      this.timeline.setTime(currentTime);
    }
    if (this.selection) {
      this.selection.update();
    }
  }

  public async addWidget (init: WidgetInit): Promise<Widget> {
    const element = await (async () => {
      switch (init.type) {
        case "image":
        {
          const img = document.createElement("img");
          img.src = init.src;
          await new Promise((resolve) => {
            img.onload = resolve;
          });
          return img;
        }
        case "text":
        {
          const div = document.createElement("div");
          div.contentEditable = "true";
          div.textContent = "Text";
          return div;
        }
        default:
          throw new Error("Invalid widget init type");
      }
    })();

    if (!init.id) {
      init.id = `id${this.idCounter++}`;
    }
    const {id} = init;
    if (this.timeline.tracks[`#${id}`]) {
      throw new Error(`Widget id already exists: ${id}`);
    }

    element.id = id;
    element.className = "widget";
    element.tabIndex = 0;
    element.draggable = false;
    element.style.transform = Gizmo.transformToCss(Gizmo.identityTransform());
    this.container.appendChild(element);

    const track: Track = {};
    this.timeline.tracks[`#${id}`] = track;
    this.timeline.updateTracks();
    const widget = new Widget(element, init);
    this.widgets.push(widget);

    element.addEventListener("keydown", (event) => {
      if (event.key === "Delete") {
        this.destroyWidget(widget);
      }
    });

    const grabElement = (event) => {
      element.focus();
      this.selection.moveable.dragStart(event);
    };
    element.addEventListener("mousedown", grabElement, true);
    element.addEventListener("touchstart", grabElement, true);
    element.addEventListener("focus", () => {
      this.selectWidget(widget);
    });
    element.addEventListener("blur", () => {
      if (this.isSelected(widget)) {
        this.selectWidget(null);
      }
    });

    return widget;
  }

  private isSelected (widget?: Widget) {
    if (this.selection === null && widget === null) {
      return true;
    }
    if (this.selection && widget && this.selection.element === widget.element) {
      return true;
    }
    return false;
  }

  private selectWidget (widget?: Widget) {
    if (this.isSelected(widget)) {
      return;
    }
    if (this.selection) {
      this.selection.destroy();
      this.selection = null;
    }
    if (widget) {
      this.selection = new Gizmo(widget.element);
      this.selection.addEventListener("keyframe", () => this.onSelectionKeyframe());
    }
  }

  public destroyWidget (widget: Widget) {
    if (this.isSelected(widget)) {
      this.selectWidget(null);
    }
    widget.element.remove();
    delete this.timeline.tracks[`#${widget.init.id}`];
    this.timeline.updateTracks();
    this.widgets.splice(this.widgets.indexOf(widget), 1);
  }

  public clearWidgets () {
    while (this.widgets.length !== 0) {
      this.destroyWidget(this.widgets.pop());
    }
  }

  private onSelectionKeyframe () {
    const {element} = this.selection;
    const track = this.timeline.tracks[`#${element.id}`];
    track[this.video.currentTime] = {
      transform: Gizmo.transformToCss(this.selection.getTransform()),
      visibility: "visible"
    };
    this.timeline.updateTracks();
  }
}