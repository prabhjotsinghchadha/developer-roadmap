export class Topic {
  constructor() {
    this.overlayId = 'topic-overlay';
    this.contentId = 'topic-content';
    this.loaderId = 'topic-loader';
    this.topicBodyId = 'topic-body';
    this.topicActionsId = 'topic-actions';
    this.markTopicDoneId = 'mark-topic-done';
    this.markTopicPendingId = 'mark-topic-pending';
    this.closeTopicId = 'close-topic';
    this.contributionTextId = 'contrib-meta';

    this.activeRoadmapId = null;
    this.activeTopicId = null;

    this.handleTopicClick = this.handleTopicClick.bind(this);

    this.close = this.close.bind(this);
    this.resetDOM = this.resetDOM.bind(this);
    this.populate = this.populate.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this.markAsDone = this.markAsDone.bind(this);
    this.markAsPending = this.markAsPending.bind(this);
    this.queryRoadmapElementsByTopicId = this.queryRoadmapElementsByTopicId.bind(this);
    this.rightClickListener = this.rightClickListener.bind(this);
    this.isTopicDone = this.isTopicDone.bind(this);

    this.init = this.init.bind(this);
  }

  get loaderEl() {
    return document.getElementById(this.loaderId);
  }

  get markTopicDoneEl() {
    return document.getElementById(this.markTopicDoneId);
  }

  get markTopicPendingEl() {
    return document.getElementById(this.markTopicPendingId);
  }

  get topicActionsEl() {
    return document.getElementById(this.topicActionsId);
  }

  get contributionTextEl() {
    return document.getElementById(this.contributionTextId);
  }

  get contentEl() {
    return document.getElementById(this.contentId);
  }

  get overlayEl() {
    return document.getElementById(this.overlayId);
  }

  rightClickListener(e) {
    const groupId = e.target?.closest('g')?.dataset?.groupId;
    if (!groupId) {
      return;
    }

    e.preventDefault();
    if (this.isTopicDone(groupId)) {
      this.markAsPending(groupId);
    } else {
      this.markAsDone(groupId);
    }
  }

  resetDOM(hideOverlay = false) {
    if (hideOverlay) {
      this.overlayEl.classList.add('hidden');
    } else {
      this.overlayEl.classList.remove('hidden');
    }

    this.loaderEl.classList.remove('hidden'); // Show loader
    this.topicActionsEl.classList.add('hidden'); // Hide Actions
    this.contributionTextEl.classList.add('hidden'); // Hide contribution text
    this.contentEl.replaceChildren(''); // Remove content
  }

  close() {
    this.resetDOM(true);

    this.activeRoadmapId = null;
    this.activeTopicId = null;
  }

  isTopicDone(topicId) {
    const normalizedGroup = topicId.replace(/^\d+-/, '');
    return localStorage.getItem(normalizedGroup) === 'done';
  }

  /**
   * @param {string | HTMLElement} html
   */
  populate(html) {
    this.contentEl.replaceChildren(html);
    this.loaderEl.classList.add('hidden');
    this.topicActionsEl.classList.remove('hidden');
    this.contributionTextEl.classList.remove('hidden');

    const isDone = this.isTopicDone(this.activeTopicId);

    if (isDone) {
      this.markTopicDoneEl.classList.add('hidden');
      this.markTopicPendingEl.classList.remove('hidden');
    } else {
      this.markTopicDoneEl.classList.remove('hidden');
      this.markTopicPendingEl.classList.add('hidden');
    }
  }

  fetchTopicHtml(roadmapId, topicId) {
    const topicPartial = topicId.replace(/^\d+-/, '').replaceAll(/:/g, '/');
    const fullUrl = `/${roadmapId}/${topicPartial}/`;

    return fetch(fullUrl)
      .then((res) => {
        return res.text();
      })
      .then((topicHtml) => {
        // It's full HTML with page body, head etc.
        // We only need the inner HTML of the #main-content
        const node = new DOMParser().parseFromString(topicHtml, 'text/html');

        return node.getElementById('main-content');
      });
  }

  handleTopicClick(e) {
    const { roadmapId, topicId } = e.detail;
    if (!topicId || !roadmapId) {
      console.log('Missing topic or roadmap: ', e.detail);
      return;
    }

    this.activeRoadmapId = roadmapId;
    this.activeTopicId = topicId;

    if (/^ext_link/.test(topicId)) {
      window.open(`https://${topicId.replace('ext_link:', '')}`);
      return;
    }

    this.resetDOM();
    this.fetchTopicHtml(roadmapId, topicId)
      .then((content) => {
        this.populate(content);
      })
      .catch((e) => {
        console.error(e);
        this.populate('Error loading the content!');
      });
  }

  queryRoadmapElementsByTopicId(topicId) {
    const elements = document.querySelectorAll(`[data-group-id$="-${topicId}"]`);
    const matchingElements = [];

    elements.forEach((element) => {
      const foundGroupId = element?.dataset?.groupId || '';
      const validGroupRegex = new RegExp(`^\\d+-${topicId}$`);

      if (validGroupRegex.test(foundGroupId)) {
        matchingElements.push(element);
      }
    });

    return matchingElements;
  }

  markAsDone(topicId) {
    const updatedTopicId = topicId.replace(/^\d+-/, '');
    localStorage.setItem(updatedTopicId, 'done');

    this.queryRoadmapElementsByTopicId(updatedTopicId).forEach((item) => {
      item?.classList?.add('done');
    });
  }

  markAsPending(topicId) {
    const updatedTopicId = topicId.replace(/^\d+-/, '');

    localStorage.removeItem(updatedTopicId);
    this.queryRoadmapElementsByTopicId(updatedTopicId).forEach((item) => {
      item?.classList?.remove('done');
    });
  }

  handleOverlayClick(e) {
    const isClickedInsideTopic = e.target.closest(`#${this.topicBodyId}`);

    if (!isClickedInsideTopic) {
      this.close();
      return;
    }

    const isClickedDone = e.target.id === this.markTopicDoneId || e.target.closest(`#${this.markTopicDoneId}`);
    if (isClickedDone) {
      this.markAsDone(this.activeTopicId);
      this.close();
    }

    const isClickedPending = e.target.id === this.markTopicPendingId || e.target.closest(`#${this.markTopicPendingId}`);
    if (isClickedPending) {
      this.markAsPending(this.activeTopicId);
      this.close();
    }

    const isClickedClose = e.target.id === this.closeTopicId || e.target.closest(`#${this.closeTopicId}`);
    if (isClickedClose) {
      this.close();
    }
  }

  init() {
    window.addEventListener('topic.click', this.handleTopicClick);
    window.addEventListener('click', this.handleOverlayClick);
    window.addEventListener('contextmenu', this.rightClickListener);

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'escape') {
        this.close();
      }
    });
  }
}
