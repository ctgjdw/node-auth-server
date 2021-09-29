# Node Auth Server

> This API Gateway was implemented for as part of the microservices for a NUS software engineering industry project.
> - This is imported from the original git repo to remove any secrets.

The Node Auth Server handles 2 main functions. The subsystem will also be responsible for handling these 2 functions:

1. The subsystem will act as an **authentication and authorisation** server. The authentication and authorisation will be handled using JWT tokens. JWT tokens will be encrypted with the following information in its claims:

>- sub (**userId**)
>- tokenType (at for **access token** or rt for **refresh token**)
>- userType (**admin, superAdmin etc**)
>- role (the **role object** will be used to handle authorisation and permissions, e.g. >superAdmin)
>- jti (**JWT Token ID**, used to track the active tokens, non-active tokens are >revoked)
>- enabled ( if user is enabled )
>- verified ( if user is verified )

The authentication APIs will always return a **pair of tokens**:

>- The **access token** (short-lived) which can be used to access other protected >resources (APIs)
>- The **refresh token** (long-lived) which can be used to refresh the credentials and >retrieve a new pair of tokens.

The current tokens will be revoked when the following events occur:

>- User Log out
>- User Logs in again
>- User refreshes tokens  


2\. The subsystem will also act as an account management server. All functions related to user accounts can be performed here. This includes but not limited to:

>- Reset Password
>- CRUD Account Details
>- Create child accounts (***for root partners and super admins***)

# Authentication

APIs marked with "AUTHORIZATION Bearer Token" in the description are protected APIs. The server will also check that the user has the appropriate permissions to do certain actions using the Bearer Token. 

The client may obtain the bearer token using the login or refresh APIs. The Authorization header with the format below is required.

~~~
'Bearer {ACCESS_TOKEN}'
~~~