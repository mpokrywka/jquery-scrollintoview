/*!
 * jQuery scrollintoview() plugin and :scrollable selector filter
 *
 * Version 2.0.4 (20 May 2016)
 * Requires jQuery 1.8 or newer
 *
 * Copyright (c) 2011 Robert Koritnik
 * Licensed under the terms of the MIT license
 * http://www.opensource.org/licenses/mit-license.php
 */

!function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        factory(root.jQuery);
    }
}
(this, function($) {
    var converter = {
        vertical: { x: false, y: true },
        horizontal: { x: true, y: false },
        both: { x: true, y: true },
        x: { x: true, y: false },
        y: { x: false, y: true }
    };

    var rootrx = /^(?:html)$/i;

    // gets border dimensions
    var borders = function(domElement, styles) {
        styles = styles || (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(domElement, null) : domElement.currentStyle);
        var px = document.defaultView && document.defaultView.getComputedStyle ? true : false;
        var b = {
            top: (parseFloat(px ? styles.borderTopWidth : $.css(domElement, "borderTopWidth")) || 0),
            left: (parseFloat(px ? styles.borderLeftWidth : $.css(domElement, "borderLeftWidth")) || 0),
            bottom: (parseFloat(px ? styles.borderBottomWidth : $.css(domElement, "borderBottomWidth")) || 0),
            right: (parseFloat(px ? styles.borderRightWidth : $.css(domElement, "borderRightWidth")) || 0)
        };
        return {
            top: b.top,
            left: b.left,
            bottom: b.bottom,
            right: b.right,
            vertical: b.top + b.bottom,
            horizontal: b.left + b.right
        };
    };

    var dimensions = function($element) {
        var elem = $element[0],
            isRoot = rootrx.test(elem.nodeName),
            $elem = isRoot ? $(window) : $element;
        return {
            border: isRoot ? { top: 0, left: 0, bottom: 0, right: 0 } : borders(elem),
            scroll: {
                top: $elem.scrollTop(),
                left: $elem.scrollLeft(),
                maxtop: elem.scrollHeight - elem.clientHeight,
                maxleft: elem.scrollWidth - elem.clientWidth
            },
            scrollbar: isRoot
                ? { right: 0, bottom: 0 }
                : {
                    right: $elem.innerWidth() - elem.clientWidth,
                    bottom: $elem.innerHeight() - elem.clientHeight
                },
            rect: isRoot ? { top: 0, left: 0, bottom: elem.clientHeight, right: elem.clientWidth } : elem.getBoundingClientRect()
        };
    };

    $.fn.scrollintoview = function scrollintoview(options) {
        /// <summary>Scrolls the first element in the set into view by scrolling its closest scrollable parent.</summary>
        /// <param name="options" type="Object">Additional options that can configure scrolling:
        ///        duration (default: "fast") - jQuery animation speed (can be a duration string or number of milliseconds)
        ///        direction (default: "both") - select possible scrollings ("vertical" or "y", "horizontal" or "x", "both")
        ///        complete (default: none) - a function to call when scrolling completes (called in context of the DOM element being scrolled)
        /// </param>
        /// <return type="jQuery">Returns the same jQuery set that this function was run on.</return>

        options = $.extend({}, scrollintoview.DEFAULTS, options);
        options.direction = converter[typeof (options.direction) === "string" && options.direction.toLowerCase()] || converter.both;

        if (!options.viewPadding || (typeof options.viewPadding != "number" &&
            typeof options.viewPadding != "object")) {
            options.viewPadding = 0;
        }
        if (typeof options.viewPadding == "number") {
            options.viewPadding = {
                left: options.viewPadding,
                right:options.viewPadding,
                top: options.viewPadding,
                bottom: options.viewPadding
            };
        }
        options.viewPadding.left = options.viewPadding.left || options.viewPadding.x || 0;
        options.viewPadding.right = options.viewPadding.right || options.viewPadding.x || 0;
        options.viewPadding.top = options.viewPadding.top || options.viewPadding.y || 0;
        options.viewPadding.bottom = options.viewPadding.bottom || options.viewPadding.y || 0;

        var dirStr = "";
        if (options.direction.x === true) dirStr = "horizontal";
        if (options.direction.y === true) dirStr = dirStr ? "both" : "vertical";

        var el = this.eq(0);
        var scroller = el.parent().closest(":scrollable(" + dirStr + ")");

        // check if there's anything to scroll in the first place
        if (scroller.length > 0) {
            scroller = scroller.eq(0);

            if (options.useMarginLeft) {
                options.viewPadding.left = options.viewPadding.left + (parseFloat(el.css('marginLeft')) || 0);
            }
            if (options.useMarginRight) {
                options.viewPadding.right = options.viewPadding.right + (parseFloat(el.css('marginRight')) || 0);
            }
            if (options.useMarginTop) {
                options.viewPadding.top = options.viewPadding.top + (parseFloat(el.css('marginTop')) || 0);
            }
            if (options.useMarginBottom) {
                options.viewPadding.bottom = options.viewPadding.bottom + (parseFloat(el.css('marginBottom')) || 0);
            }

            var dim = {
                e: dimensions(el),
                s: dimensions(scroller)
            };

            var rel = {
                top: dim.e.rect.top - (dim.s.rect.top + dim.s.border.top) - options.viewPadding.top,
                bottom: dim.s.rect.bottom - dim.s.border.bottom - dim.s.scrollbar.bottom - dim.e.rect.bottom - options.viewPadding.bottom,
                left: dim.e.rect.left - (dim.s.rect.left + dim.s.border.left) - options.viewPadding.left,
                right: dim.s.rect.right - dim.s.border.right - dim.s.scrollbar.right - dim.e.rect.right - options.viewPadding.right
            };

            var animProperties = {};

            // vertical scroll
            if (options.direction.y === true) {
                if (rel.top < 0) {
                    animProperties.scrollTop = Math.max(0, dim.s.scroll.top + rel.top);
                } else if (rel.top > 0) {
                    if (options.alwaysTop) {
                        animProperties.scrollTop = Math.min(dim.s.scroll.top + rel.top, dim.s.scroll.maxtop);
                    } else if (rel.bottom < 0) {
                        animProperties.scrollTop = Math.min(dim.s.scroll.top + Math.min(rel.top, -rel.bottom), dim.s.scroll.maxtop);
                    }
                }
            }

            // horizontal scroll
            if (options.direction.x === true) {
                if (rel.left < 0) {
                    animProperties.scrollLeft = Math.max(0, dim.s.scroll.left + rel.left);
                } else if (rel.left > 0) {
                    if (options.alwaysLeft) {
                        animProperties.scrollLeft = Math.min(dim.s.scroll.left + rel.left, dim.s.scroll.maxleft);
                    } else if (rel.right < 0) {
                        animProperties.scrollLeft = Math.min(dim.s.scroll.left + Math.min(rel.left, -rel.right), dim.s.scroll.maxleft);
                    }
                }
            }

            // scroll if needed
            if (!$.isEmptyObject(animProperties)) {
                var scrollExpect = {},
                    scrollListener = scroller;

                if (rootrx.test(scroller[0].nodeName)) {
                    scroller = $("html,body");
                    scrollListener = $(window);
                }

                function animateStep(now, tween) {
                    scrollExpect[tween.prop] = Math.floor(now);
                }

                var scroll_complete = true;
                function onscroll(event) {
                    $.each(scrollExpect, function(key, value) {
                        if (Math.abs(value - scrollListener[key]()) > 1) {
                            scroll_complete = false;
                            scroller.stop('scrollintoview');
                        }
                    });
                }

                scrollListener.on('scroll', onscroll);

                scroller
                    .stop('scrollintoview')
                    .animate(animProperties, {
                        duration: options.duration,
                        step: animateStep,
                        queue: 'scrollintoview'
                    })
                    .eq(0) // we want function to be called just once (ref. "html,body")
                    .queue('scrollintoview', function(next) {
                        scrollListener.off('scroll', onscroll);
                        $.isFunction(options.complete) && options.complete.call(scroller[0], scroll_complete);
                        next();
                    });

                scroller.dequeue('scrollintoview');
            } else {
                // when there's nothing to scroll, just call the "complete" function
                $.isFunction(options.complete) && options.complete.call(scroller[0], null);
            }
        }

        // return set back
        return this;
    };
    $.fn.scrollintoview.DEFAULTS = {
        duration: "fast",
        direction: "both",
        viewPadding: 0
    };

    var scrollValue = {
        auto: true,
        scroll: true,
        visible: false,
        hidden: false
    };

    var scroll = function(element, direction) {
        direction = converter[typeof (direction) === "string" && direction.toLowerCase()] || converter.both;
        var styles = (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(element, null) : element.currentStyle);
        var overflow = {
            x: scrollValue[styles.overflowX.toLowerCase()] || false,
            y: scrollValue[styles.overflowY.toLowerCase()] || false,
            isRoot: rootrx.test(element.nodeName)
        };

        // check if completely unscrollable (exclude HTML element because it's special)
        if (!overflow.x && !overflow.y && !overflow.isRoot) {
            return false;
        }

        var size = {
            height: {
                scroll: element.scrollHeight,
                client: element.clientHeight
            },
            width: {
                scroll: element.scrollWidth,
                client: element.clientWidth
            },
            // check overflow.x/y because iPad (and possibly other tablets) don't dislay scrollbars
            scrollableX: function() {
                return (overflow.x || overflow.isRoot) && this.width.scroll > this.width.client;
            },
            scrollableY: function() {
                return (overflow.y || overflow.isRoot) && this.height.scroll > this.height.client;
            }
        };
        return direction.y && size.scrollableY() || direction.x && size.scrollableX();
    };

    $.expr[":"].scrollable = $.expr.createPseudo(function(direction) {
        return function(element) {
            return scroll(element, direction);
        };
    });
});
