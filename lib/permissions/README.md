Permissions
===========

See (relations)[https://github.com/carlos8f/node-relations] for more information.

## permission-schema.json

This file contains a listing of contexts, which will be added to *relations*. A *context* the the context in which a user's privileges will be evaulated. For instance, if the context is `study`, then the roles and actions listed within the context correspond to a user's role in a study. Similarly, if the context is `site`, then the user's permissions will be evaulated based on their role with the site.

The context consists of roles, and which actions they are allowed to perform. Most COINS actions will be limited based on study roles. For instance, the ability to edit an instrument will be determined by the person's role in the study. The corresponding context to this would look like:

```
study : {
    PI: [
        'update_Instrument',
        'read_Instrument',
        'create_Instrument',
        ....
    ]
}

## TODO

* **Dynamic contexts and roles:** For now, the schema will be hard coded into *permission-schema.json*. Eventually, we will want to be able to dynamically add roles and actions to each context, and persist that to disk. Initially, this could be done by simply writing to disk, or we could utilize a document store (e.g. pouchdb) to handle that for us.

* **Heirarchical Roles:** To simplify role configuration, we should allow roles to contain other roles. For instance, a PI should be able to do everything that a Coordinator can do. This might become trickier with persistence.
