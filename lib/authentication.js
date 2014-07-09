'use strict';


var stormpath = require('./stormpath');


/**
 * This callback, when called, will simply continue processing the HTTP
 * request.
 *
 * @callback nextCallback
 */


/**
 * Assert that a user is logged into an account before allowing the user to
 * continue.  If the user is not logged in, they will be redirected to the login
 * page.
 *
 * @method
 *
 * @param {Object} req - The http request.
 * @param {Object} res - The http response.
 * @param {nextCallback} next - The callback which is called to continue
 *   processing the request if the user is authenticated.
 */
module.exports.loginRequired = function(req, res, next) {
  if (!res.locals.user) {
    var url = req.app.get('stormpathLoginUrl') + '?next=' + encodeURIComponent(req.originalUrl);
    res.redirect(302, url);
  } else {
    next();
  }
};


/**
 * Assert that a user is a member of one or more groups before allowing the user
 * to continue.  If the user is not logged in, or does not meet the group
 * requirements, they will be redirected to the login page.
 *
 * @method
 *
 * @param {String[]} groups - A list of groups to assert membership in.  Groups
 *   must be specified by group name.
 * @param {Boolean} [all=true] - Should we assert the user is a member of all groups,
 *   or just one?
 *
 * @returns {Function} Returns an express middleware which asserts a user's
 *   group membership, and only allows the user to continue if the assertions
 *   are true.
 */
module.exports.groupsRequired = function(groups, all) {
  all = all === false ? false : true;

  return function(req, res, next) {
    // Ensure the user is logged in.
    if (!res.locals.user) {
      var url = req.app.get('stormpathLoginUrl') + '?next=' + encodeURIComponent(req.originalUrl);
      res.redirect(302, url);

    // If this user must be a member of all groups, we'll ensure that is the
    // case.
    } else {
      var done = groups.length;
      var safe = false;

      res.locals.user.getGroups(function(err, grps) {
        if (err) {
          res.redirect(302, req.app.get('stormpathLogoutUrl'));
        } else {
          // Iterate through each group on the user's account, checking to see
          // whether or not it's one of the required groups.
          grps.each(function(group, c) {
            if (groups.indexOf(group.name) > -1) {
              if (!all || --done === 0) {
                safe = true;
                next();
              }
            }
            c();
          },
          // If we get here, it means the user didn't meet the requirements,
          // so we'll log them out.
          function() {
            if (!safe) {
              res.redirect(302, req.app.get('stormpathLogoutUrl'));
            }
          });
        }
      });
    }
  };
};
