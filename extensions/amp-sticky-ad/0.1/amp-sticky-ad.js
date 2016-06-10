/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CSS} from '../../../build/amp-sticky-ad-0.1.css';
import {Layout} from '../../../src/layout';
import {dev, user} from '../../../src/log';
import {isExperimentOn} from '../../../src/experiments';
import {timer} from '../../../src/timer';
import {toggle} from '../../../src/style';
import {setStyles} from '../../../src/style';

/** @const */
const TAG = 'amp-sticky-ad';

class AmpStickyAd extends AMP.BaseElement {
  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.NODISPLAY;
  }

  /** @override */
  buildCallback() {
    /** @const @private {boolean} */
    this.isExperimentOn_ = isExperimentOn(this.getWin(), TAG);
    if (!this.isExperimentOn_) {
      dev.warn(TAG, `TAG ${TAG} disabled`);
      return;
    }

    this.element.classList.add('-amp-sticky-ad-layout');
    const children = this.getRealChildren();
    user.assert((children.length == 1 && children[0].tagName == 'AMP-AD'),
        'amp-sticky-ad must have a single amp-ad child');

    /** @const @private {!Element} */
    this.ad_ = children[0];

    /** @private @const {!Viewport} */
    this.viewport_ = this.getViewport();

    /** @private @const {!Vsync} */
    this.vsync_ = this.getVsync();

    /** @private @const {!Function|null}*/
    this.bindedHorizontalScroll_ = null;

    /**
     * On viewport scroll, check requirements for amp-stick-ad to display.
     * @const @private {!Unlisten}
     */
    this.scrollUnlisten_ =
        this.viewport_.onScroll(() => this.displayAfterScroll_());
  }


  /** @override */
  layoutCallback() {
    this.isExperimentOn_ = isExperimentOn(this.getWin(), TAG);
    if (!this.isExperimentOn_) {
      dev.warn(TAG, `TAG ${TAG} disabled`);
      return Promise.resolve();
    }
    return Promise.resolve();
  }

  /** @override */
  detachedCallback() {
    this.removeOnScrollListener_();
  }

  /**
   * The function that remove listener to viewport onScroll event.
   * @private
   */
  removeOnScrollListener_() {
    if (this.scrollUnlisten_) {
      this.scrollUnlisten_();
      this.scrollUnlisten_ = null;
    }
  }

  /**
   * The function that remove listener to sticky-ad onHorizontal scroll event.
   * @private
   */
  removeOnHorizontalListener_() {
    if (this.bindedOnHorizontalScroll_) {
      this.element.removeEventListener('scroll',
          this.bindedOnHorizontalScroll_);
      this.bindedOnHorizontalScroll_ = null;
    }
  }

  /**
   * The listener function that listen on onScroll event and
   * show sticky ad when user scroll at least one viewport and
   * there is at least one more viewport available.
   * @private
   */
  displayAfterScroll_() {
    const scrollTop = this.viewport_.getScrollTop();
    const viewportHeight = this.viewport_.getSize().height;
    const scrollHeight = this.viewport_.getScrollHeight();
    this.viewportWidth_ = this.viewport_.getSize().width;
    if (scrollHeight < viewportHeight * 2) {
      this.removeOnScrollListener_();
      return;
    }

    // Check user has scrolled at least one viewport from init position.
    if (scrollTop > viewportHeight) {
      this.deferMutate(() => {
        toggle(this.element, true);
        this.viewport_.addToFixedLayer(this.element);
        this.scheduleLayout(this.ad_);
        // Add border-bottom to the body to compensate space that was taken
        // by sticky ad, so no content would be blocked by sticky ad unit.
        const borderBottom = this.element./*OK*/offsetHeight;
        this.viewport_.updatePaddingBottom(borderBottom);
        // TODO(zhouyx): need to delete borderBottom when sticky ad is dismissed
        this.removeOnScrollListener_();
        timer.delay(() => {
          // Unfortunately we don't really have a good way to measure how long it
          // takes to load an ad, so we'll just pretend it takes 1 second for
          // now.
          this.vsync_.mutate(() => {
            this.element.classList.add('amp-sticky-ad-loaded');
          });
        }, 1000);
        this.scrollTimeout_ = null;
        this.positioningInProgress_ = null;

        const dummyElement = global.document.createElement('div');
        dummyElement.classList.add('-amp-sticky-ad-delete-box');
        dummyElement.style.minHeight = borderBottom + 'px';
        this.element.appendChild(dummyElement);

        if (!this.bindedHorizontalScroll_) {
          this.bindedOnHorizontalScroll_ = this.onHorizontalScroll_.bind(this);
        }
        this.element.addEventListener('scroll', this.bindedOnHorizontalScroll_);
      });
    }
  }

  /**
   * The listener function that listen on sticky-ad horizontal scroll event.
   * Dismiss sticky-ad after scroll certain distance, or re-center sticky-ad.
   * @private
   */
  onHorizontalScroll_() {
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout);
    }
    if (this.element.scrollLeft > this.viewportWidth_ * 0.35) {
      this.deferMutate(() => {
        this.positionInProgress = true;
        this.element.classList.add('-amp-sticky-ad-delete');
        timer.delay(() => {
          toggle(this.element, false);
          this.viewport_.updatePaddingBottom(0);
        }, 500);
        this.removeOnHorizontalListener_();
        return;
      });
      // TODO: UX? Delete icon?
    }
    this.scrollTimeout = window.setTimeout(() => {
      if (this.element.scrollLeft != 0) {
        this.deferMutate(() => {
          this.centerElement();
        });
      }
    }, 150);
  }

  /**
   * Function to re-center sticky-ad.
   * @private
   */
  centerElement() {
    if (this.positionInProgress) {
      return;
    }
    this.poisitioningInProgress = true;
    this.vsync_.mutatePromise(() => {
      setStyles(this.element, {
        'overflowX': 'hidden',
      });
      this.element.scrollLeft = 0;
    }).then(() => {
      this.vsync_.mutate(() => {
        setStyles(this.element, {
          'overflowX': 'scroll',
        });
        this.positionInProgress_ = false;
      });
    });
  }
}

AMP.registerElement('amp-sticky-ad', AmpStickyAd, CSS);
