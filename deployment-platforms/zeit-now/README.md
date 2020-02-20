# ZEIT Now

## Deployment

When deploying on this platform, the build is created on the server and hence the correct binary is available as `prisma2 generate` runs on the server. 

Hence, we do not need to provide additional platform targeting options like `platforms`. With no additional parameters necessary, the generate section of the Prisma schema file looks like 

```
generator photon {
    provider = "photonjs"
}
```

To deploy the example to you now account, please run `now -b POSTGRESQL_URL=@postgresql_url -e POSTGRESQL_URL=@postgresql_url`
Note that this uses the [secrets feature](https://zeit.co/docs/v2/build-step#using-environment-variables-and-secrets) of the now platform.

## Environment

Deploying to this platform requires setting up the production environment variables correctly. Please refer to the following section to find out how that can be done

Local Development: https://zeit.co/docs/v2/development/environment-variables
Cloud Deployment: https://zeit.co/docs/v2/deployments/environment-variables-and-secrets
