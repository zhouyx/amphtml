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
    console.log('inStickyAdBuildCallback');
    this.element.classList.add('-amp-sticky-ad-layout');
    const children = this.getRealChildren();
    // user.assert((children.length == 1 && children[0].tagName == 'AMP-AD'),
        // 'amp-sticky-ad must have a single amp-ad child');

    /** @const @private {!Element} */
    this.ad_ = children[0];

    /** @private @const {!Viewport} */
    this.viewport_ = this.getViewport();

    /** @const @private {!Vsync} */
    this.vsync_ = this.getVsync();

    /**
     * On viewport scroll, check requirements for amp-stick-ad to display.
     * @const @private {!UnlistenDef}
     */
    this.scrollUnlisten_ =
        this.viewport_.onScroll(() => this.displayAfterScroll_());
  }

  /** @override */
  layoutCallback() {
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
   * The listener function that listen on onScroll event and
   * show sticky ad when user scroll at least one viewport and
   * there is at least one more viewport available.
   * @private
   */
  displayAfterScroll_() {
    console.log('IndisplayAfterScroll');
    const scrollTop = this.viewport_.getScrollTop();
    const viewportHeight = this.viewport_.getSize().height;
    const scrollHeight = this.viewport_.getScrollHeight();
    if (scrollHeight < viewportHeight * 2) {
      this.removeOnScrollListener_();
      return;
    }

    // Check user has scrolled at least one viewport from init position.
    if (scrollTop > viewportHeight) {
      // const addFix = isExperimentOn(this.getWin(), 'addFix');
      // const scheduleLayout = isExperimentOn(this.getWin(), 'scheduleLayout');
      // const updatePadding = isExperimentOn(this.getWin(), 'updatePadding');
      // const changeStyle = isExperimentOn(this.getWin(), 'changeStyle');
      const addFix = true;
      const scheduleLayout = true;
      const updatePadding = true;
      const changeStyle = true;
      this.removeOnScrollListener_();
      console.log('put deferMutate into queue');
      this.deferMutate(() => {
        setStyles(this.element, {
          'display': 'flex',
          'visibility': 'visible',
          'min-height': '50px',
        });
        if(addFix) {
          console.log('add to fixed layer');
          this.viewport_.addToFixedLayer(this.element);
        }
        if(scheduleLayout) {
          this.scheduleLayout(this.ad_);
          console.log('scheduleLayout');
        }
        // Add border-bottom to the body to compensate space that was taken
        // by sticky ad, so no content would be blocked by sticky ad unit.
        const borderBottom = this.element./*OK*/offsetHeight;
        if(updatePadding) {
          this.viewport_.updatePaddingBottom(borderBottom);
          console.log('updatePaddingBottom');
        }
        // TODO(zhouyx): need to delete borderBottom when sticky ad is dismissed
        timer.delay(() => {
          // Unfortunately we don't really have a good way to measure how long it
          // takes to load an ad, so we'll just pretend it takes 1 second for
          // now.
          this.vsync_.mutate(() => {
            if(changeStyle) {
              this.element.classList.add('amp-sticky-ad-loaded');
              console.log('after add clssList');
            }
          });
        }, 1000);
      });
    }
  }
}

AMP.registerElement('amp-sticky-ad', AmpStickyAd, CSS);
