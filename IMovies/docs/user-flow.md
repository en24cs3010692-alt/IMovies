# iMovies User Flow

## Customer booking flow

```mermaid
flowchart TD
    A([Open iMovies]) --> B[Browse movies]
    B --> C[Select a movie]
    C --> D[View available shows]
    D --> E[Choose a show]
    E --> F[Select available seats]
    F --> G{Logged in?}
    G -- No --> H[Register or log in]
    H --> F
    G -- Yes --> I[Review booking]
    I --> J[Demo checkout]
    J --> K{Demo result}
    K -- Failure --> L[Show error and allow retry]
    L --> J
    K -- Success --> M[Create booking]
    M --> N[Open My Bookings]
    N --> O[View ticket details / QR]
    O --> P[Verify ticket reference]
    N --> Q[Cancel booking if eligible]
    Q --> R[Update booking and seat availability]
```

The exact order of login and seat selection may differ in the interface. This diagram shows the intended high-level flow rather than every UI condition.

## Admin flow

```mermaid
flowchart TD
    A([Open iMovies]) --> B[Log in]
    B --> C{Admin role?}
    C -- No --> D[Use customer features]
    C -- Yes --> E[Open Admin Dashboard]
    E --> F[Manage movies]
    E --> G[Manage shows]
    E --> H[Review bookings]
    F --> I[Save changes through API]
    G --> I
    H --> I
    I --> J[(MongoDB)]
```

Admin access must be enforced by backend role checks, not merely by hiding admin controls in the frontend.

## Main customer actions

1. Browse available movies.
2. Select a movie and choose a showtime.
3. Choose seats that are available.
4. Complete the simulated checkout.
5. Review the booking in My Bookings.
6. Open ticket details and QR code.
7. Cancel an eligible booking if needed.

## Failure and edge cases to test

- Login credentials are invalid or the token is missing/expired.
- A requested movie or show does not exist.
- A selected seat is already booked or becomes unavailable before checkout.
- Demo checkout fails.
- Booking creation fails after a seat reservation attempt.
- A user tries to view or cancel another user's booking.
- A non-admin attempts to call an admin-only API.
- A ticket is cancelled and its verification response should not imply it is still valid.

## Payment limitation

Checkout outcomes are simulated for demonstration. The app should not be described as processing real card payments or issuing actual refunds unless a payment provider and its server-side verification/refund workflow have been integrated.
