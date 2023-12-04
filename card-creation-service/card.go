// card.go
package main

import (
    "fmt"
    "math/rand"
    "time"
)

type Card struct {
    Name        string
    Description string
}

func CreateRandomCard() Card {
    rand.Seed(time.Now().UnixNano())
    return Card{
        Name:        fmt.Sprintf("Card-%d", rand.Intn(100)),
        Description: "This is a randomly generated card",
    }
}
