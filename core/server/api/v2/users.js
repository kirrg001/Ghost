const Promise = require('bluebird');
const models = require('../../models/index');
const common = require('../../lib/common/index');
const permissionsService = require('../../services/permissions/index');
const allowedIncludes = ['count.posts', 'permissions', 'roles', 'roles.permissions'];

module.exports = {
    browse: {
        validation: {
            docName: 'users',
            queryOptions: ['include', 'status', 'absolute_urls'],
            queryOptionsValues: {
                include: allowedIncludes
            }
        },
        permissions: {
            docName: 'users',
            method: 'browse'
        },
        query(options) {
            return models.User.findPage(options.modelOptions);
        }
    },

    read: {
        validation: {
            config: {
                docName: 'users',
                urlProperties: ['id', 'slug', 'status', 'email', 'role'],
                queryOptions: ['include', 'absolute_urls'],
                queryOptionsValues: {
                    include: allowedIncludes
                }
            },
            after: (options) => {
                // CASE: special handling for /users/me request
                if (options.data.id === 'me' && options.modelOptions.context && options.modelOptions.context.user) {
                    options.data.id = options.modelOptions.context.user;
                }

                return Promise.resolve();
            }
        },
        permissions: {
            docName: 'users',
            method: 'read'
        },
        query(options) {
            return models.User.findOne(options.data, options.modelOptions)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        }));
                    }

                    return {
                        users: [model.toJSON(options.modelOptions)]
                    };
                });
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        validation: {
            config: {
                docName: 'users',
                queryOptions: ['include', 'id'],
                queryOptionsValues: {
                    include: allowedIncludes
                }
            },
            after: (options) => {
                // CASE: the password should never be set via this endpoint, if it is passed, ignore it
                if (options.data.users && options.data.users[0] && options.data.users[0].password) {
                    delete options.data.users[0].password;
                }

                // CASE: can't edit my own status to inactive or locked
                if (options.modelOptions.id === options.modelOptions.context.user) {
                    if (models.User.inactiveStates.indexOf(options.data.users[0].status) !== -1) {
                        return Promise.reject(new common.errors.NoPermissionError({
                            message: common.i18n.t('errors.api.users.cannotChangeStatus')
                        }));
                    }
                }

                if (options.modelOptions.id === 'me' && options.modelOptions.context && options.modelOptions.context.user) {
                    options.modelOptions.id = options.modelOptions.context.user;
                }

                return Promise.resolve();
            }
        },
        permissions: {
            config: {
                docName: 'users',
                method: 'edit'
            },
            // @TODO move manual role permissions out of here
            after: (options) => {
                // CASE: if roles aren't in the payload, proceed with the edit
                if (!(options.data.users[0].roles && options.data.users[0].roles[0])) {
                    return Promise.resolve();
                }

                const role = options.data.users[0].roles[0],
                    roleId = role.id || role,
                    editedUserId = options.modelOptions.id;

                let contextUser, contextRoleId;

                return models.User.findOne({id: options.modelOptions.context.user, status: 'all'}, {withRelated: ['roles']})
                    .then((_contextUser) => {
                        contextUser = _contextUser;
                        contextRoleId = contextUser.related('roles').toJSON(options.modelOptions)[0].id;

                        if (roleId !== contextRoleId && editedUserId === contextUser.id) {
                            return Promise.reject(new common.errors.NoPermissionError({
                                message: common.i18n.t('errors.api.users.cannotChangeOwnRole')
                            }));
                        }

                        return models.User.findOne({role: 'Owner'});
                    })
                    .then((owner) => {
                        if (contextUser.id !== owner.id) {
                            if (editedUserId === owner.id) {
                                if (owner.related('roles').at(0).id !== roleId) {
                                    return Promise.reject(new common.errors.NoPermissionError({
                                        message: common.i18n.t('errors.api.users.cannotChangeOwnersRole')
                                    }));
                                }
                            } else if (roleId !== contextRoleId) {
                                return permissionsService.canThis(options.modelOptions.context).assign.role(role);
                            }
                        }
                    })
                    .catch((err) => {
                        return Promise.reject(new common.errors.NoPermissionError({
                            err,
                            context: common.i18n.t('errors.api.users.noPermissionToEditUser')
                        }));
                    });
            }
        },
        query(options) {
            return models.User.edit(options.data.users[0], options.modelOptions)
                .then((model) => {
                    if (!model) {
                        return Promise.reject(new common.errors.NotFoundError({
                            message: common.i18n.t('errors.api.users.userNotFound')
                        }));
                    }

                    return {
                        users: [model.toJSON(options.modelOptions)]
                    };
                });
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        validation: {
            docName: 'posts',
            queryOptions: ['id']
        },
        permissions: {
            docName: 'users',
            method: 'destroy'
        },
        query(options) {
            options.modelOptions.status = 'all';

            return models.Base.transaction((t) => {
                options.modelOptions.transacting = t;

                return Promise.all([
                    models.Accesstoken.destroyByUser(options.modelOptions),
                    models.Refreshtoken.destroyByUser(options.modelOptions),
                    models.Post.destroyByAuthor(options.modelOptions)
                ]).then(() => {
                    return models.User.destroy(options.modelOptions);
                }).return(null);
            }).catch((err) => {
                return Promise.reject(new common.errors.NoPermissionError({
                    err: err
                }));
            });
        }
    }
};
